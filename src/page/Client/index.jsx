import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://1835-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Client() {
  const { roomId } = useParams();
  const videoRef = useRef(null);

  useEffect(() => {
    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      alert("Sala não está mais disponível!");
    });

    socket.on("screenStream", ({ track }) => {
      const stream = new MediaStream();
      stream.addTrack(track);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    socket.on("stopScreenShare", () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });
  }, [roomId]);

  // Função para capturar o movimento do mouse
  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    socket.emit("moveMouse", { roomId, x: clientX, y: clientY });
  };

  // Função para capturar o movimento do toque no celular
  const handleTouchMove = (event) => {
    const touch = event.touches[0]; // Pega o primeiro toque na tela
    socket.emit("moveMouse", { roomId, x: touch.clientX, y: touch.clientY });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{ width: "100vw", height: "100vh", background: "#eee" }}
    >
      <h1>Cliente Conectado na Sala {roomId}</h1>
      <p>Arraste o dedo na tela para controlar o mouse do Host.</p>
      <video
        ref={videoRef}
        autoPlay
        style={{ width: "100%", border: "1px solid black" }}
      />
    </div>
  );
}
