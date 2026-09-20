/**
 * Capture caméra EN DIRECT (anti-fraude) — utilisée pour les preuves de check-in/out.
 * La photo provient forcément du flux caméra (getUserMedia + canvas), jamais de la
 * galerie. Nécessite un contexte sécurisé (localhost ou HTTPS).
 */
import React, { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { uploadMedia, type ApiError } from "../../api/fleet";

type ToastState = { message: string; kind: "ok" | "err" } | null;
const errMsg = (e: unknown) => (e as ApiError)?.fr || "Erreur inattendue";

export const CameraCapture: React.FC<{
  label: string;
  mediaId: string | null;
  onUploaded: (id: string) => void;
  notify: (t: ToastState) => void;
  facing?: "environment" | "user";
}> = ({ label, mediaId, onUploaded, notify, facing = "environment" }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  // Démarre / arrête le flux caméra selon l'ouverture de l'overlay.
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch {
        notify({ message: "Caméra indisponible ou accès refusé. Autorisez la caméra pour prendre la photo.", kind: "err" });
        setOpen(false);
      }
    })();
    return () => { active = false; stop(); };
  }, [open, facing]);

  useEffect(() => () => stop(), []); // sécurité : coupe le flux au démontage

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setBusy(true);
    canvas.toBlob(async (blob) => {
      if (!blob) { setBusy(false); return; }
      try {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const m = await uploadMedia(file);
        onUploaded(m.id);
        setPreview(URL.createObjectURL(blob));
        setOpen(false);
      } catch (e) { notify({ message: errMsg(e), kind: "err" }); }
      finally { setBusy(false); }
    }, "image/jpeg", 0.85);
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-[#8A8A8A]">{label}{mediaId ? " ✓" : " *"}</span>
        <button type="button" onClick={() => setOpen(true)}
          className={`h-28 rounded-xl border overflow-hidden flex items-center justify-center ${mediaId ? "border-[#22C55E]" : "border-dashed border-[#33363F]"} bg-[#0F0F11]`}>
          {preview ? <img src={preview} className="w-full h-full object-cover" alt={label} />
            : <div className="flex flex-col items-center text-[#8A8A8A]"><Camera size={20} /><span className="text-[10px] mt-1">Prendre la photo</span></div>}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 text-white text-sm">
              <span>{label}</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1"><X size={24} /></button>
            </div>
            <video ref={videoRef} playsInline muted className="flex-1 w-full min-h-0 object-cover" />
            <div className="flex items-center justify-center py-6 bg-black">
              <button onClick={capture} disabled={busy} aria-label="Capturer"
                className="w-16 h-16 rounded-full bg-white ring-4 ring-[#22C55E] disabled:opacity-50 active:scale-95 transition" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
