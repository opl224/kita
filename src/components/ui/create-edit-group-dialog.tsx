
'use client';

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useDialogBackButton } from "@/components/layout/app-shell";

const groupFormSchema = z.object({
  name: z.string().min(3, "Nama grup minimal 3 karakter."),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

type Group = {
  id: string;
  name: string;
  members: any[];
  lastMessage?: string;
  lastMessageTime?: any;
  createdBy: string;
};

const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

export function CreateEditGroupDialog({ open, onOpenChange, editingGroup, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, editingGroup: Group | null, onSubmit: (data: GroupFormValues) => void }) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "" },
  });

  useDialogBackButton(open, onOpenChange);

  useEffect(() => {
    if (editingGroup) {
      form.setValue("name", editingGroup.name);
    } else {
      form.reset({ name: "" });
    }
  }, [editingGroup, form, open]);

  const handleSubmit = (data: GroupFormValues) => {
      onSubmit(data);
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-transparent border-none shadow-none sm:max-w-md">
            <div className="bg-background rounded-2xl shadow-neumorphic-outset p-6">
                <DialogHeader>
                    <DialogTitle>{editingGroup ? 'Ubah Nama Grup' : 'Buat Grup Baru'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{editingGroup ? 'Nama Grup Baru' : 'Nama Grup'}</FormLabel>
                                <FormControl>
                                <Input placeholder="Contoh: Tim Proyek Hebat" {...field} className={neumorphicInputStyle} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className={`${neumorphicButtonStyle} w-full`}>{editingGroup ? 'Simpan Perubahan' : 'Buat Grup'}</Button>
                    </form>
                </Form>
            </div>
        </DialogContent>
    </Dialog>
  );
}
