import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    messages: string[];
    onConfirm: () => void;
    onClose: () => void;
}

function ConfirmDialog(props: ConfirmDialogProps) {
    const { onConfirm, onClose, title, messages, open } = props;

    const handleConfirm = () => {
        onConfirm();
    };

    const handleClose = () => {
        onClose();
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
                <Button onClick={handleClose}>
                    Close
                </Button>
                <Button onClick={handleConfirm} autoFocus>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ConfirmDialog