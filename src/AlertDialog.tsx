import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export interface AlertDialogProps {
    open: boolean;
    title: string;
    messages: string[];
    onConfirm: () => void;
}

function AlertDialog(props: AlertDialogProps) {
    const { onConfirm, title, messages, open } = props;

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <Dialog open={open}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {messages.map((message, index) => (
                    <DialogContentText key={index}>
                        {message}
                    </DialogContentText>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleConfirm} autoFocus>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default AlertDialog