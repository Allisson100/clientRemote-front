import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://09f1-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Client() {
  const { roomId } = useParams();
  const videoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      alert("Sala não está mais disponível!");
    });
  }, [roomId]);

  useEffect(() => {
    socket.emit("register", { role: "receiver" });

    peerConnection.current = new RTCPeerConnection();

    peerConnection.current.ontrack = (event) => {
      videoRef.current.srcObject = event.streams[0];
    };

    socket.on("offer", (offer) => {
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      peerConnection.current.createAnswer().then((answer) => {
        peerConnection.current.setLocalDescription(answer);
        socket.emit("answer", answer);
      });
    });

    socket.on("candidate", (candidate) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

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

  // Captura cliques do mouse e envia para o host
  const handleMouseClick = (event) => {
    socket.emit("mouseClick", {
      roomId,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
    });
  };

  // Captura teclas pressionadas e envia para o host
  const handleKeyDown = (event) => {
    socket.emit("keyPress", { roomId, key: event.key });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onClick={handleMouseClick} // Adiciona captura de clique
      onKeyDown={handleKeyDown} // Adiciona captura de tecla pressionada
      tabIndex={0} // Garante que o evento de teclado funcione
      style={{
        width: "100vw",
        height: "100vh",
        background: "#eee",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div>
        <h1>Cliente Conectado na Sala {roomId}</h1>
        <p>Arraste o dedo na tela para controlar o mouse do Host.</p>
      </div>

      <video
        ref={videoRef}
        autoPlay
        style={{ width: "90vw", height: "90vh", border: "1px solid black" }}
      />
    </div>
  );
}
