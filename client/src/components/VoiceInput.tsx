import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

type VoiceInputProps = {
  onResult: (data: any) => void;
  onClose: () => void;
};

export default function VoiceInput({ onResult, onClose }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.voice.uploadAndTranscribe.useMutation();
  const parseMutation = trpc.voice.parseMedicationFromText.useMutation();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Check size
        if (blob.size > 16 * 1024 * 1024) {
          toast.error("录音文件过大，请缩短录音时间");
          return;
        }

        setIsProcessing(true);
        try {
          // Convert to base64
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );

          // Transcribe
          const transcribeResult = await transcribeMutation.mutateAsync({
            audioBase64: base64,
            mimeType: mediaRecorder.mimeType,
            language: "zh",
          });

          setTranscribedText(transcribeResult.text);

          // Parse medication info from text
          const parseResult = await parseMutation.mutateAsync({
            text: transcribeResult.text,
          });

          onResult(parseResult);
        } catch (err: any) {
          toast.error("语音处理失败: " + (err.message || "请重试"));
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      toast.error("无法访问麦克风，请检查浏览器权限设置");
    }
  }, [transcribeMutation, parseMutation, onResult]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <p className="text-base text-muted-foreground mb-2">
          {isRecording
            ? "正在录音，请说出药物信息..."
            : isProcessing
              ? "正在识别语音..."
              : "点击下方按钮开始录音"}
        </p>
        <p className="text-sm text-muted-foreground">
          例如："阿司匹林，每天三次，每次一片，一共三十片"
        </p>
      </div>

      {/* Recording button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200"
            : isProcessing
              ? "bg-muted cursor-not-allowed"
              : "bg-primary hover:bg-navy-light shadow-lg golden-glow"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-10 h-10 text-white" />
        ) : (
          <Mic className="w-10 h-10 text-primary-foreground" />
        )}
      </button>

      <p className="text-lg font-semibold text-foreground">
        {isRecording
          ? "点击停止录音"
          : isProcessing
            ? "正在处理中..."
            : "点击开始录音"}
      </p>

      {transcribedText && (
        <div className="w-full p-4 bg-muted rounded-xl">
          <p className="text-sm text-muted-foreground mb-1">识别结果：</p>
          <p className="text-base text-foreground">{transcribedText}</p>
        </div>
      )}

      <Button
        variant="outline"
        onClick={onClose}
        className="text-base py-4 rounded-xl golden-border"
        disabled={isProcessing}
      >
        取消
      </Button>
    </div>
  );
}
