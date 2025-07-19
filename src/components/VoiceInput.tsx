
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedProgress } from '@/components/ui/enhanced-progress';
import { Mic, MicOff, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });


      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => {
          track.stop();
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Microphone access error:', error);
      let errorMessage = 'Failed to start recording.';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Microphone is already in use by another application.';
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      toast.info('Processing audio...');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setUploadProgress(0);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Simulate upload progress
        setUploadProgress(30);
        
        // Send to speech-to-text function
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio }
        });

        setUploadProgress(70);

        if (error) {
          console.error('Speech-to-text error:', error);
          if (error.message?.includes('rate limit')) {
            throw new Error('Too many requests. Please wait a moment before trying again.');
          } else if (error.message?.includes('audio')) {
            throw new Error('Invalid audio format. Please try recording again.');
          } else {
            throw new Error(error.message || 'Failed to transcribe audio');
          }
        }

        setUploadProgress(90);

        if (data.text && data.text.trim()) {
          onTranscription(data.text.trim());
          setUploadProgress(100);
          toast.success('Voice message transcribed!');
        } else {
          toast.warning('No speech detected. Please try again.');
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Audio processing error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to process audio. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        className={`transition-all duration-200 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-terminal-cyan/10 hover:bg-terminal-cyan/20 border-terminal-cyan/30'
        }`}
      >
        {isProcessing ? (
          <Square className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
      
      {/* Upload Progress Indicator */}
      {isProcessing && uploadProgress > 0 && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-48">
          <EnhancedProgress
            value={uploadProgress}
            size="sm"
            label="Processing voice"
            showPercentage={true}
            variant={uploadProgress === 100 ? 'success' : 'default'}
            loading={uploadProgress < 100}
          />
        </div>
      )}
    </div>
  );
};
