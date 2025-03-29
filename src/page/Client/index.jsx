import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("https://a0e9-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Client() {
  const { roomId } = useParams();
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const iceCandidatesQueue = useRef([]);

  console.log("roomId", roomId);
  console.log("videoRef", videoRef);
  console.log("peerConnection", peerConnection);
  console.log("iceCandidatesQueue", iceCandidatesQueue);

  useEffect(() => {
    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      alert("Sala não está mais disponível!");
    });
  }, [roomId]);

  useEffect(() => {
    socket.emit("register", { role: "receiver" });
    peerConnection.current = new RTCPeerConnection();

    // Log do estado da conexão ICE
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state:",
        peerConnection.current.iceConnectionState
      );
    };

    // Quando a track remota chegar, atribui ao elemento de vídeo
    peerConnection.current.ontrack = (event) => {
      console.log("Track recebida:", event);
      let stream;
      if (event.streams && event.streams[0]) {
        stream = event.streams[0];
      } else {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    // Ao receber a oferta do host
    socket.on("offer", (offer) => {
      if (!peerConnection.current.remoteDescription) {
        console.log("Oferta recebida:", offer);
        peerConnection.current
          .setRemoteDescription(offer)
          .then(() => {
            return peerConnection.current.createAnswer();
          })
          .then((answer) => {
            return peerConnection.current
              .setLocalDescription(answer)
              .then(() => answer);
          })
          .then((answer) => {
            console.log("Enviando answer:", answer);
            socket.emit("answer", answer);
          })
          .catch((err) => console.error("Erro ao processar a oferta:", err));
      }
    });

    // Recebe ICE candidates do host
    socket.on("candidate", (candidate) => {
      if (candidate) {
        console.log("Candidate recebido:", candidate);
        if (!peerConnection.current.remoteDescription) {
          iceCandidatesQueue.current.push(candidate);
        } else {
          peerConnection.current
            .addIceCandidate(candidate)
            .catch((err) =>
              console.error("Erro ao adicionar ICE candidate:", err)
            );
        }
      }
    });

    // Checa periodicamente se o remoteDescription foi definido para aplicar os ICE candidates pendentes
    const waitRemoteDesc = setInterval(() => {
      if (peerConnection.current.remoteDescription) {
        iceCandidatesQueue.current.forEach((candidate) => {
          peerConnection.current
            .addIceCandidate(candidate)
            .catch((err) =>
              console.error("Erro ao adicionar ICE candidate da fila:", err)
            );
        });
        iceCandidatesQueue.current = [];
        clearInterval(waitRemoteDesc);
      }
    }, 100);

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      socket.off("offer");
      socket.off("candidate");
    };
  }, [videoRef.current]);

  const handleForcePlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => console.log("Forçado o play do vídeo."))
        .catch((err) => console.error("Erro ao forçar play:", err));
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
        style={{ width: "450px", border: "1px solid black" }}
      />
      <button onClick={handleForcePlay}>Forçar Play do Vídeo</button>
    </div>
  );
}
