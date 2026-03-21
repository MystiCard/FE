import React, { useCallback, useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type AdminConfirmOptions = {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
};

/** Trả về hàm `confirm` (async, resolve khi user bấm Xác nhận) + JSX dialog — thay cho `window.confirm`. */
export function useAdminConfirm() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('Xác nhận');
    const [description, setDescription] = useState('');
    const [confirmLabel, setConfirmLabel] = useState('Xác nhận');
    const [cancelLabel, setCancelLabel] = useState('Hủy');
    const [variant, setVariant] = useState<'default' | 'destructive'>('destructive');
    const resolveRef = useRef<((ok: boolean) => void) | null>(null);

    const confirm = useCallback((message: string, options?: AdminConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setTitle(options?.title ?? 'Xác nhận');
            setDescription(message);
            setConfirmLabel(options?.confirmLabel ?? 'Xác nhận');
            setCancelLabel(options?.cancelLabel ?? 'Hủy');
            setVariant(options?.variant ?? 'destructive');
            resolveRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const finish = useCallback((ok: boolean) => {
        resolveRef.current?.(ok);
        resolveRef.current = null;
        setOpen(false);
    }, []);

    const onOpenChange = useCallback(
        (next: boolean) => {
            if (!next) finish(false);
        },
        [finish]
    );

    const dialog = (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-left">{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => finish(false)}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={() => finish(true)}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return { confirm, confirmDialog: dialog };
}
