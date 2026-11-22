"use client";

import { useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "connected" | "error";

export default function LiveVoice() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [message, setMessage] = useState("");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectingRef = useRef(false);

  function releaseConnection() {
    channelRef.current?.close();
    channelRef.current = null;

    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
  }

  function stopVoice() {
    connectingRef.current = false;
    releaseConnection();
    setStatus("idle");
    setMessage("Voice session ended. Your microphone has been turned off.");
  }

  async function startVoice() {
    if (connectingRef.current || status === "connected") return;

    const approved = window.confirm(
      "Live Voice uses the paid OpenAI Realtime API and may create usage charges. Continue only when the account owner and a parent or guardian have approved API use and a spending limit is set. Start a voice session?"
    );
    if (!approved) return;

    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setStatus("error");
      setMessage("This browser does not support the required microphone or WebRTC features. Try a recent version of Chrome or Edge.");
      return;
    }

    connectingRef.current = true;
    setStatus("connecting");
    setMessage("Preparing a secure voice session…");

    try {
      // The normal API key stays on the server. Only a short-lived client secret is returned.
      const tokenResponse = await fetch("/api/realtime/token", {
        method: "POST",
        cache: "no-store"
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || typeof tokenData.value !== "string") {
        throw new Error(tokenData.error || "Could not create a secure voice session.");
      }

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.ontrack = (event) => {
        const audio = audioRef.current;
        if (audio) {
          audio.srcObject = event.streams[0];
          void audio.play().catch(() => {
            setMessage("Voice is connected. If you cannot hear Aurora, allow audio playback in your browser.");
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
          setStatus("connected");
          setMessage("Connected. Speak naturally in Bengali or English. You can interrupt Aurora by speaking.");
        } else if (peer.connectionState === "failed") {
          releaseConnection();
          setStatus("error");
          setMessage("The voice connection failed. Check your network and API access, then try again.");
        }
      };

      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = microphone;
      microphone.getTracks().forEach((track) => peer.addTrack(track, microphone));

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onopen = () => {
        setStatus("connected");
        setMessage("Connected. Speak naturally in Bengali or English. You can interrupt Aurora by speaking.");
      };
      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "error") {
            setMessage(payload.error?.message || "A voice session error occurred.");
          }
        } catch {
          // Ignore non-JSON data channel messages.
        }
      };
      channel.onerror = () => setMessage("The voice event channel reported an error.");

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${tokenData.value}`,
          "Content-Type": "application/sdp"
        }
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        throw new Error(
          sdpResponse.status === 429
            ? "Realtime API usage is unavailable. Check API credit balance and usage limits."
            : sdpResponse.status === 401 || sdpResponse.status === 403
              ? "OpenAI rejected the temporary voice credential. Check API key permissions."
              : "Could not establish a voice connection. Please try again."
        );
      }

      await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setMessage("Connecting microphone and speaker…");
    } catch (error) {
      releaseConnection();
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to start Live Voice.");
    } finally {
      connectingRef.current = false;
    }
  }

  useEffect(() => {
    return () => releaseConnection();
  }, []);

  return (
    <div className="voice-control">
      {status === "connected" ? (
        <button className="voice-button voice-button-active" type="button" onClick={stopVoice}>
          <span aria-hidden="true">■</span> End voice
        </button>
      ) : (
        <button
          className="voice-button"
          type="button"
          onClick={startVoice}
          disabled={status === "connecting"}
        >
          <span aria-hidden="true">🎙</span> {status === "connecting" ? "Connecting…" : "Live voice"}
        </button>
      )}
      {status !== "idle" && (
        <span className={`voice-message ${status === "error" ? "voice-message-error" : ""}`} role="status">
          {message}
        </span>
      )}
      <audio ref={audioRef} autoPlay playsInline className="voice-audio" />
    </div>
  );
}
