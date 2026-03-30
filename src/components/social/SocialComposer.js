import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { Send, Image, Video, Shield, Megaphone, X } from "lucide-react";
export function SocialComposer({ userInitial = "U", userAvatar, onSubmit, onUploadMedia }) {
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("general");
    const [expanded, setExpanded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaFile, setMediaFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Validate size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert("File troppo grande. Massimo 10MB.");
            return;
        }
        setMediaFile(file);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);
        setExpanded(true);
    };
    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileRef.current)
            fileRef.current.value = "";
    };
    const handleSubmit = async () => {
        if ((!content.trim() && !mediaFile) || submitting)
            return;
        setSubmitting(true);
        setUploading(!!mediaFile);
        let imageUrl;
        if (mediaFile) {
            const url = await onUploadMedia(mediaFile);
            if (url)
                imageUrl = url;
        }
        await onSubmit(content.trim(), postType, imageUrl);
        setContent("");
        setPostType("general");
        setExpanded(false);
        removeMedia();
        setSubmitting(false);
        setUploading(false);
    };
    const isVideo = mediaFile?.type.startsWith("video/");
    return (_jsxs("div", { className: "bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden", children: [_jsx("input", { ref: fileRef, type: "file", accept: "image/*,video/*", className: "hidden", onChange: handleFileSelect }), _jsxs("div", { className: "flex items-start gap-3 p-4 pb-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary to-accent shrink-0 mt-0.5", children: userAvatar ? (_jsx("img", { src: userAvatar, alt: "", className: "w-full h-full rounded-full object-cover" })) : (_jsx("div", { className: "w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary", children: userInitial })) }), _jsx("textarea", { value: content, onChange: (e) => setContent(e.target.value), onFocus: () => setExpanded(true), placeholder: "A cosa stai pensando in viaggio? \uD83D\uDE9B", className: "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none min-h-[38px] leading-relaxed", rows: expanded ? 3 : 1, maxLength: 2000 })] }), mediaPreview && (_jsx("div", { className: "px-4 pb-3", children: _jsxs("div", { className: "relative rounded-xl overflow-hidden border border-border/30 max-h-64", children: [isVideo ? (_jsx("video", { src: mediaPreview, className: "w-full max-h-64 object-cover", controls: true })) : (_jsx("img", { src: mediaPreview, alt: "", className: "w-full max-h-64 object-cover" })), _jsx("button", { onClick: removeMedia, className: "absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-destructive hover:text-destructive-foreground transition-all", children: _jsx(X, { size: 14 }) })] }) })), _jsxs("div", { className: "border-t border-border/30 px-3 py-2.5 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 overflow-x-auto", children: [_jsxs("button", { onClick: () => fileRef.current?.click(), className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-accent text-[11px] font-medium transition-all", children: [_jsx(Image, { size: 14 }), " Foto"] }), _jsxs("button", { onClick: () => {
                                    if (fileRef.current) {
                                        fileRef.current.accept = "video/*";
                                        fileRef.current.click();
                                        fileRef.current.accept = "image/*,video/*";
                                    }
                                }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-accent text-[11px] font-medium transition-all", children: [_jsx(Video, { size: 14 }), " Video"] }), _jsxs("button", { onClick: () => setPostType(postType === "safety_tip" ? "general" : "safety_tip"), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all border ${postType === "safety_tip"
                                    ? "bg-destructive/15 border-destructive/40 text-destructive"
                                    : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary"}`, children: [_jsx(Shield, { size: 13 }), " Safety"] }), _jsxs("button", { onClick: () => setPostType(postType === "announcement" ? "general" : "announcement"), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all border ${postType === "announcement"
                                    ? "bg-primary/15 border-primary/40 text-primary"
                                    : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary"}`, children: [_jsx(Megaphone, { size: 13 }), " Annuncio"] })] }), _jsx("button", { onClick: handleSubmit, disabled: (!content.trim() && !mediaFile) || submitting, className: "flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-[11px] font-bold disabled:opacity-30 hover:shadow-[var(--glow-gold-subtle)] transition-all shrink-0", children: uploading ? (_jsx("div", { className: "w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" })) : (_jsx(Send, { size: 13 })) })] })] }));
}
