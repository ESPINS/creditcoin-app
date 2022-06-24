#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// #![windows_subsystem = "console"]

use std::fs;
use std::io::{BufRead, Write as IoWrite};
use std::path::Path;
use std::{
    process::Child,
    sync::{Arc, Mutex},
};

use chrono::Local;
use interprocess::local_socket::{LocalSocketListener, LocalSocketStream};
use lazy_static::lazy_static;
use log::{Level, LevelFilter, Metadata, Record};
use tauri::Manager;
use tauri_plugin_highlander::*;
use tauri_plugin_log::LoggerBuilder;

const LOCAL_SOCKET_NAME: &str = "/tmp/creditcoin_log.sock";

lazy_static! {
    static ref PROCESS_CHILD: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(Option::None));
    static ref LOCAL_SOCKET_CLIENT: Arc<Mutex<Option<LocalSocketStream>>> =
        Arc::new(Mutex::new(Option::None));
}

static TAURI_LOGGER: TauriLogger = TauriLogger;
struct TauriLogger;

#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

impl log::Log for TauriLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= Level::Info && metadata.target() != "frame-executive"
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let message = format!(
                "{} {}\n",
                Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                record.args()
            );

            match LOCAL_SOCKET_CLIENT.lock().unwrap().as_mut() {
                Some(conn) => {
                    match conn.write_all(message.as_bytes()) {
                        Ok(_) => (),
                        Err(e) => {
                            eprintln!("send logMessage error : {}", e);
                            print!("{}", message);
                        }
                    };
                }
                None => {
                    print!("{}", message);
                }
            };
        }
    }

    fn flush(&self) {}
}

fn kill_creditcoin_process() {
    match PROCESS_CHILD.lock().unwrap().as_mut() {
        Some(child) => match child.kill() {
            Ok(_) => (),
            Err(e) => {
                eprintln!("stop_creditcoin error : {}", e);
            }
        },
        None => (),
    }
}

#[tauri::command]
fn start_creditcoin(args: Vec<String>) {
    let app_path = std::env::args_os().next().unwrap();

    std::thread::spawn(move || {
        match std::process::Command::new(app_path)
            .args(args)
            .arg("--logger-mode")
            .arg("WithoutLoggerInit")
            .spawn()
        {
            Ok(child) => {
                PROCESS_CHILD.lock().unwrap().replace(child);
            }
            Err(e) => {
                eprintln!("start_creditcoin error : {}", e);
            }
        }
    });
}

#[tauri::command]
fn stop_creditcoin() {
    kill_creditcoin_process();
}

#[tauri::command]
fn validate_path(path: String) -> bool {
    let path = Path::new(&path);
    return fs::create_dir_all(path).is_ok();
}

fn main() {
    let cli = creditcoin_node::command::from_args();

    if cli.logger_mode == "WithoutLoggerInit" {
        match LocalSocketStream::connect(LOCAL_SOCKET_NAME) {
            Ok(conn) => {
                LOCAL_SOCKET_CLIENT.lock().unwrap().replace(conn);
            }
            Err(e) => {
                eprintln!("sender connection error : {}", e);
            }
        };

        log::set_logger(&TAURI_LOGGER).unwrap();
        log::set_max_level(LevelFilter::Info);

        creditcoin_node::command::run().unwrap();
    } else {
        let context = tauri::generate_context!();

        let app = tauri::Builder::default()
            .menu(tauri::Menu::os_default(&context.package_info().name))
            .setup(|app| {
                let main_window = app.get_window("main").unwrap();

                // init logListener
                std::thread::spawn(move || {
                    let listener = LocalSocketListener::bind(LOCAL_SOCKET_NAME).unwrap();
                    loop {
                        match listener.accept() {
                            Ok(conn) => {
                                let mut reader = std::io::BufReader::new(conn);
                                loop {
                                    let mut buffer = String::new();
                                    match reader.read_line(&mut buffer) {
                                        Ok(_) => {
                                            main_window.app_handle().emit_all("tauri-logger", Payload { message: buffer.into(), },).unwrap();
                                        }
                                        Err(_) => {
                                            break;
                                        }
                                    };
                                }
                            }
                            Err(e) => {
                                eprintln!("receiver accpet error : {}", e);
                            }
                        }
                    }
                });

                Ok(())
            })
            .plugin(HighlanderBuilder::default().build())
            .plugin(LoggerBuilder::new().build())
            .invoke_handler(tauri::generate_handler![start_creditcoin, stop_creditcoin, validate_path])
            .build(context)
            .expect("error while building tauri application");

        app.run(|_app_handle, event| match event {
            tauri::RunEvent::Exit => {
                kill_creditcoin_process();
            }
            _ => {}
        });
    }
}
