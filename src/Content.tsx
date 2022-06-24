import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import { Backdrop, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch } from '@mui/material';
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { http } from '@tauri-apps/api'
import { ResponseType } from '@tauri-apps/api/http';
import { info } from 'tauri-plugin-log-api'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { hexToU8a, isHex } from '@polkadot/util'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count';
import Convert from 'ansi-to-html';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import './Content.css'

const addressExpression: RegExp = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/;

function Content() {
    const [followState, setFollowState] = useState<boolean>(true);
    const [mineState, setMineState] = useState<boolean>(false);
    const [mineDialogOpenState, setMineDialogOpenState] = useState<boolean>(false);
    const [backdropOpenState, setBackdropOpenState] = useState(false);
    const [tauriLoggerInitState, setTauriLoggerInitState] = useState(false);
    const [confirmOpenState, setConfirmOpenState] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState({
        title: "",
        messages: [""],
        onConfirm: () => { },
        onClose: () => { }
    });
    const [alertOpenState, setAlertOpenState] = useState(false);
    const [alertMessage, setAlertMessage] = useState({
        title: "",
        messages: [""],
        onConfirm: () => { }
    });
    const [telemetryNodeName, setTelemetryNodeName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [port, setPort] = useState<string>("");
    const [dataPath, setDataPath] = useState<string>("");
    const [miningAddress, setMiningAddress] = useState<string>("");

    const defulatPortNumber = "30333";
    const defaultDataPath = "/creditcoin-app/mainnet/data";
    const startupConfigKey = "startupConfig";

    const editor = useEditor({
        extensions: [
            StarterKit,
            CharacterCount
        ],
        editable: false
    });

    const ansiConverter = new Convert();

    interface Payload {
        message: string;
    }

    const startButtonClick = () => {
        setMineDialogOpenState(true);
        let startupConfigJson = localStorage.getItem(startupConfigKey);
        if (startupConfigJson != null) {
            let startupConfig: any = JSON.parse(startupConfigJson);

            setTelemetryNodeName(startupConfig.telemetryNodeName);
            setAddress(startupConfig.address);
            setPort(startupConfig.port);
            setDataPath(startupConfig.dataPath);
            setMiningAddress(startupConfig.miningAddress);

        } else {

            setPort(defulatPortNumber);
            setDataPath(defaultDataPath);

        }
    }

    const stopButtonClick = () => {
        setMineState(false);
        invoke('stop_creditcoin');
    }

    const validateAddress = (address: string) => {
        if (addressExpression.test(address)) {
            return true;
        }
        return false;
    }

    const validatePort = (port: string) => {
        if (/^\d*$/.test(port)) {
            let portNumber = parseInt(port);
            if (portNumber >= 1024 && portNumber <= 65535) {
                return true;
            }
        }
        return false;
    }

    const validateDataPath = async (dataPath: string) => {
        return await invoke('validate_path', { path: dataPath });
    }

    const validateAccountAddress = (address: string) => {
        try {
            encodeAddress(
                isHex(address)
                    ? hexToU8a(address)
                    : decodeAddress(address)
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    const handleMineDialogClose = () => {
        setMineDialogOpenState(false);
    }

    const handleMineDialogApply = async () => {
        if (telemetryNodeName.length == 0) {
            setAlertMessage({
                title: 'Validate Telemetry Node Name',
                messages: ['Telemetry Node Name is required'],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
            return;
        }
        if (validateAddress(address) == false) {
            setAlertMessage({
                title: 'Validate Address',
                messages: ['Current Value : ' + address, 'Address format is wrong'],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
            return;
        }
        if (validatePort(port) == false) {
            setAlertMessage({
                title: 'Validate Port',
                messages: ['Current Value : ' + port, 'Must be an integer in the range 1024 to 65535'],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
            return;
        }
        if (await validateDataPath(dataPath) == false) {
            setAlertMessage({
                title: 'Validate data path',
                messages: ['Current Value : ' + dataPath, 'Data path is wrong'],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
            return;
        }
        if (validateAccountAddress(miningAddress) == false) {
            setAlertMessage({
                title: 'Validate Account Key',
                messages: ['Current Value : ' + miningAddress, 'Account address format is invalid (Polkadot address)'],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
            return;
        }
        setMineDialogOpenState(false);
        localStorage.setItem(startupConfigKey, JSON.stringify({
            telemetryNodeName: telemetryNodeName,
            address: address,
            port: port,
            dataPath: dataPath,
            miningAddress: miningAddress
        }));
        setFollowState(true);
        editor?.setEditable(true);
        setTimeout(function () {
            editor?.view.focus();
            editor?.setEditable(false);
        }, 0);
        setMineState(true);
        if (tauriLoggerInitState == false) {
            setTauriLoggerInitState(true);
            listen('tauri-logger', event => {
                let payload = event.payload as Payload;
                if (payload.message.length > 0 && editor != null) {
                    setFollowState((follow) => {
                        let chainedCommands = editor.chain();

                        // Set the cursor to the last position
                        chainedCommands.focus('end', { scrollIntoView: follow });

                        // Write...
                        chainedCommands.insertContent(ansiConverter.toHtml(payload.message));

                        if (follow == false) {
                            if (editor.view.state.selection != null) {
                                let selection = editor.view.state.selection;
                                // restore selection
                                chainedCommands.setTextSelection({ from: selection.from, to: selection.to });
                            }
                        }

                        chainedCommands.run();

                        let textLength = editor.storage.characterCount.characters();
                        let nodeCount = editor.storage.characterCount.characters({ mode: 'nodeSize' });

                        if (textLength >= 10_000_000) {
                            let removeNodeCount = parseInt((nodeCount / 2).toFixed());
                            editor.commands.deleteRange({ from: 0, to: removeNodeCount });
                        }

                        return follow;
                    });
                }
            });
        }
        let creditcoinArgs: string[] = [
            "--validator",
            "--name",
            telemetryNodeName,
            "--telemetry-url",
            "wss://telemetry.polkadot.io/submit/ 0",
            "--bootnodes",
            "/dns4/bootnode.creditcoin.network/tcp/30333/p2p/12D3KooWAEgDL126EUFxFfdQKiUhmx3BJPdszQHu9PsYsLCuavhb",
            "/dns4/bootnode2.creditcoin.network/tcp/30333/p2p/12D3KooWRubm6c4bViYyvTKnSjMicC35F1jZNrzt3MKC9Hev5vbG",
            "/dns4/bootnode3.creditcoin.network/tcp/30333/p2p/12D3KooWSdzZaqoDAncrQmMUi34Nr29TayCr4xPvqcJQc5J434tZ",
            "--public-addr",
            "/dns4/" + address + "/tcp/" + port,
            "--chain",
            "mainnet",
            "--mining-key",
            miningAddress,
            "--base-path",
            dataPath,
            "--port",
            port
        ];
        invoke('start_creditcoin', { args: creditcoinArgs });
    }

    const handleIpAddressLookup = () => {
        if (address.length == 0) {
            fetchIpAddressLookup();
            return;
        }
        setConfirmMessage({
            title: 'Public IP Lookup',
            messages: ['Current Value : ' + address, 'Can I overwrite it?'],
            onConfirm: () => {
                setConfirmOpenState(false);
                fetchIpAddressLookup();
            },
            onClose: () => {
                setConfirmOpenState(false);
            }
        })
        setConfirmOpenState(true);
    }

    const fetchIpAddressLookup = async () => {
        setBackdropOpenState(true);
        await http.fetch('https://checkip.amazonaws.com', {
            method: 'GET',
            responseType: ResponseType.Text,
            timeout: 30,
        }).then((res) => {
            setAddress((res.data as string).replace('\n', ''));
        }).catch((err) => {
            setAlertMessage({
                title: 'Public IP Lookup Error',
                messages: [err],
                onConfirm: () => {
                    setAlertOpenState(false);
                }
            });
            setAlertOpenState(true);
        }).finally(() => {
            setBackdropOpenState(false);
        });
    }

    const handlePortDefault = () => {
        if (port.length == 0) {
            setPort(defulatPortNumber);
            return;
        }
        setConfirmMessage({
            title: 'Set port number as default',
            messages: ['Current Value : ' + port, 'Can I overwrite it?'],
            onConfirm: () => {
                setConfirmOpenState(false);
                setPort(defulatPortNumber);
            },
            onClose: () => {
                setConfirmOpenState(false);
            }
        })
        setConfirmOpenState(true);
    }

    const handleDataPathDefault = () => {
        if (dataPath.length == 0) {
            setDataPath(defaultDataPath);
            return;
        }
        setConfirmMessage({
            title: 'Set data path to default',
            messages: ['Current Value : ' + dataPath, 'Can I overwrite it?'],
            onConfirm: () => {
                setConfirmOpenState(false);
                setDataPath(defaultDataPath);
            },
            onClose: () => {
                setConfirmOpenState(false);
            }
        })
        setConfirmOpenState(true);
    }

    return (
        <Paper sx={{ margin: 'auto', overflow: 'hidden', height: '100%' }}>
            <AppBar
                position="static"
                color="default"
                elevation={0}
                sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}
            >
                <Toolbar>
                    <Grid container alignItems="center">
                        {/* <Grid item>
                            <SearchIcon color="inherit" sx={{ display: 'block' }} />
                        </Grid>
                        <Grid item xs>
                            <TextField
                                fullWidth
                                placeholder="Search by email address, phone number, or user UID"
                                InputProps={{
                                    disableUnderline: true,
                                    sx: { fontSize: 'default' },
                                }}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item>
                            <Button variant="contained" sx={{ mr: 1 }}>
                                Add user
                            </Button>
                            <Tooltip title="Reload">
                                <IconButton>
                                    <RefreshIcon color="inherit" sx={{ display: 'block' }} />
                                </IconButton>
                            </Tooltip>
                        </Grid> */}
                        <Grid item xs>Creditcoin Mining</Grid>
                        <Grid item>
                            <FormControlLabel control={
                                <Switch checked={followState} onChange={(e) => { setFollowState(e.target.checked) }} />
                            } label="Follow Log" />
                        </Grid>
                        <Grid item>
                            <Button variant="contained" size="medium" sx={{ mr: 1 }} onClick={startButtonClick} disabled={mineState}>
                                Mining Start
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button variant="contained" size="medium" sx={{ mr: 1 }} onClick={stopButtonClick} disabled={!mineState}>
                                Mining Stop
                            </Button>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Typography sx={{ my: 4, mx: 4, fontSize: 14 }}>
                <EditorContent editor={editor} />
            </Typography>
            <Dialog open={mineDialogOpenState}>
                <DialogTitle>Mining Startup Config</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField sx={{ width: 500 }} value={telemetryNodeName} onChange={(e) => { setTelemetryNodeName(e.target.value) }} label="Telemetry Node Name (Any name is possible)" variant="standard" />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField sx={{ width: 500 }} value={address} onChange={(e) => { setAddress(e.target.value) }} label="IP Address or domain" variant="standard" InputProps={{
                                endAdornment: <Tooltip title="Public IP Lookup"><IconButton onClick={handleIpAddressLookup}>
                                    <RefreshIcon />
                                </IconButton></Tooltip>
                            }} />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField sx={{ width: 500 }} value={port} onChange={(e) => { setPort(e.target.value) }} label="Port" variant="standard" InputProps={{
                                endAdornment: <Tooltip title="Set port number as default"><IconButton onClick={handlePortDefault}>
                                    <RefreshIcon />
                                </IconButton></Tooltip>
                            }} />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField sx={{ width: 500 }} value={dataPath} onChange={(e) => { setDataPath(e.target.value) }} label="Data Path" variant="standard" InputProps={{
                                endAdornment: <Tooltip title="Set data path to default"><IconButton onClick={handleDataPathDefault}>
                                    <RefreshIcon />
                                </IconButton></Tooltip>
                            }} />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField sx={{ width: 500 }} value={miningAddress} onChange={(e) => { setMiningAddress(e.target.value) }} label="Mining Account Address (Polkadot address)" variant="standard" InputProps={{
                                endAdornment: <Tooltip title="Go to Install the Polkadot Extension Tool"><IconButton target='_blank' href='https://polkadot.js.org/extension/'>
                                    <LinkIcon />
                                </IconButton></Tooltip>
                            }} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleMineDialogClose}>Cancel</Button>
                    <Button color="success" onClick={handleMineDialogApply}>Apply</Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog open={confirmOpenState} title={confirmMessage.title} messages={confirmMessage.messages} onConfirm={confirmMessage.onConfirm} onClose={confirmMessage.onClose} />
            <AlertDialog open={alertOpenState} title={alertMessage.title} messages={alertMessage.messages} onConfirm={alertMessage.onConfirm} />
            <Backdrop open={backdropOpenState} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 999 }}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Paper>
    );
}

export default Content