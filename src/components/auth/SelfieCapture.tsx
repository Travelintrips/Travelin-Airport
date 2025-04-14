import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SelfieCaptureProps {
  onCapture: (image: string) => void;
  onBlinkDetected: () => void;
  blinkDetected: boolean;
}

const SelfieCapture: React.FC<SelfieCaptureProps> = ({
  onCapture,
  onBlinkDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    setCapturedImage(null);
    if (stream) {
      stopCamera();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Browser tidak mendukung akses kamera");
        return;
      }

      console.log("Requesting camera access");

      // Try with mobile-friendly constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      console.log("Camera access granted");

      // Set stream first
      setStream(mediaStream);

      // Auto-trigger verification immediately
      onBlinkDetected();

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                console.log("Video playback started");
                setIsCapturing(true);
              })
              .catch((err) => {
                console.error("Error playing video:", err);
              });
          }
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        if (imageData) {
          console.log("Image uploaded successfully");
          setCapturedImage(imageData);
          onCapture(imageData);
          onBlinkDetected(); // Auto-verify uploaded images
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Gagal mengupload gambar. Silakan coba lagi.");
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      try {
        console.log("Attempting to capture image");

        // Get video dimensions
        const videoWidth = videoRef.current.videoWidth || 640;
        const videoHeight = videoRef.current.videoHeight || 480;

        console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);

        // Set canvas dimensions to match video
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const context = canvasRef.current.getContext("2d");
        if (!context) {
          throw new Error("Could not get canvas context");
        }

        // Flip horizontally if using front camera (mirror effect)
        context.translate(videoWidth, 0);
        context.scale(-1, 1);

        // Draw the current video frame to the canvas
        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

        // Reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);

        // Convert canvas to image data with maximum quality
        const imageData = canvasRef.current.toDataURL("image/jpeg", 0.95);
        console.log("Image captured successfully");

        // Set the captured image and pass it to the parent component
        setCapturedImage(imageData);
        onCapture(imageData);
        stopCamera();
      } catch (error) {
        console.error("Error capturing image:", error);
        alert("Gagal mengambil gambar. Silakan coba lagi.");
      }
    } else {
      console.error("Video or canvas reference not available");
      alert("Kamera tidak siap. Silakan coba lagi.");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-card">
      <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden">
        {isCapturing ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-muted">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="hidden"
          width="1280"
          height="720"
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>

      <div className="flex flex-col space-y-2 w-full">
        {!isCapturing && !capturedImage && (
          <div className="flex flex-col space-y-2 w-full">
            <Button onClick={startCamera} type="button" className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Mulai Kamera
            </Button>
            <div className="relative w-full">
              <Input
                type="file"
                accept="image/*"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload Foto
              </Button>
            </div>
          </div>
        )}

        {isCapturing && (
          <Button onClick={captureImage} type="button" className="w-full">
            Ambil Foto
          </Button>
        )}

        {capturedImage && (
          <Button
            onClick={startCamera}
            type="button"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Ambil Ulang
          </Button>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
