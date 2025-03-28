import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://1676-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Client() {
  const { roomId } = useParams();
  const userVideoRef = useRef(null);
  const peerConnection = useRef(null);

  console.log("userVideoRef", userVideoRef);
  console.log("peerConnection", peerConnection);

  useEffect(() => {
    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      alert("Sala não está mais disponível!");
    });
  }, [roomId]);

  useEffect(() => {
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidate);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleNewICECandidate);
    };
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        userVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const handleOffer = async (offer) => {
    try {
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", answer);
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  };

  const handleAnswer = (answer) => {
    peerConnection.current.setRemoteDescription(answer);
  };

  const handleNewICECandidate = (candidate) => {
    if (peerConnection.current) {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

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

  useEffect(() => {
    let lastTouchTime = 0;
    const doubleTapThreshold = 300; // Intervalo máximo entre toques em milissegundos

    const handleTouchStart = (event) => {
      const currentTime = new Date().getTime();
      if (currentTime - lastTouchTime <= doubleTapThreshold) {
        // Detectou um duplo toque
        console.log("Duplo toque detectado!");
        // Aqui, você pode emitir um evento para o servidor ou realizar outra ação desejada
        socket.emit("mouseDown");
      }
      lastTouchTime = currentTime;
    };

    // Enviar eventos de teclado
    const handleKeyDown = (event) => {
      socket.emit("keyboardEvent", { key: event.key });
    };

    // Enviar eventos de mouse

    const handleMouseDown = (event) => {
      socket.emit("mouseDown", { button: event.button });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("touchstart", handleTouchStart);

    // Limpeza dos event listeners
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#eee",
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div>
        <h1>Cliente Conectado na Sala {roomId}</h1>
        <p>Arraste o dedo na tela para controlar o mouse do Host.</p>
      </div>

      <video
        style={{ width: "80vw", height: "80vh" }}
        ref={userVideoRef}
        autoPlay
      ></video>
    </div>
  );
}
