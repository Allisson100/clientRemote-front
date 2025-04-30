import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { decryptObject } from "../../utils/handleDecryptObject";
import StyledInput from "../../components/StyledInput";

export default function Client() {
  const navigate = useNavigate();
  const { urlCode } = useParams();

  const userVideoRef = useRef(null);
  const peerConnection = useRef(null);

  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);

  const [sharedImage, setSharedImage] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [inputValue, setInputValue] = useState("");

  //  ### CONEXÃO HOST E CLIENT PARA STREM DO VIDEO ###
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
    setShowVideo(true);
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
  //  ### CONEXÃO HOST E CLIENT PARA STREM DO VIDEO ###

  // CAPTURA O MOUSE DO CLIENT E ENVIA PARA O BACKEND
  const handleMouseMove = (event) => {
    if (!socket) return;

    const { clientX, clientY } = event;
    const normalizedX = clientX / window.innerWidth;
    const normalizedY = clientY / window.innerHeight;
    socket.emit("moveMouse", { roomId, x: normalizedX, y: normalizedY });
  };

  // CAPTURA O TPUCH NO CELULAR DO CLIENT E ENVIA PARA O BACKEND
  const handleTouchMove = (event) => {
    if (!socket) return;

    const touch = event.touches[0];
    const normalizedX = touch.clientX / window.innerWidth;
    const normalizedY = touch.clientY / window.innerHeight;
    socket.emit("moveMouse", { roomId, x: normalizedX, y: normalizedY });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    socket.emit("inputValueChange", {
      roomId,
      value: e.target.value,
    });
  };

  // ESCUTA OS EVENTO DE MOUSE, TOUCH SCREEN E TECLADO
  useEffect(() => {
    if (!socket) return;

    let lastTouchTime = 0;
    const doubleTapThreshold = 300; // Intervalo máximo entre toques em milissegundos

    const handleTouchStart = (event) => {
      const currentTime = new Date().getTime();
      if (currentTime - lastTouchTime <= doubleTapThreshold) {
        socket.emit("mouseDown");
      }
      lastTouchTime = currentTime;
    };

    const handleMouseDown = (event) => {
      socket.emit("mouseDown", { button: event.button });
    };

    const normalizeKey = (key) => {
      const map = {
        " ": "space",
        ",": "comma",
        ".": "period",
        "/": "slash",
        "\\": "backslash",
        ";": "semicolon",
        "'": "quote",
        "[": "openbracket",
        "]": "closebracket",
        "-": "minus",
        "=": "equals",
        "`": "grave",
      };

      const lower = key.toLowerCase();
      return map[lower] || lower;
    };

    const handleKeyDown = (event) => {
      const rawKey = event.key;
      const key = normalizeKey(rawKey);

      const allowedKeys = new Set([
        ..."abcdefghijklmnopqrstuvwxyz",
        ..."0123456789",
        ..."f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12".split(" "),
        "enter",
        "escape",
        "backspace",
        "tab",
        "delete",
        "insert",
        "home",
        "end",
        "pageup",
        "pagedown",
        "up",
        "down",
        "left",
        "right",
        "space",
        "printscreen",
        "shift",
        "control",
        "alt",
        "command",
        "comma",
        "period",
        "slash",
        "backslash",
        "semicolon",
        "quote",
        "openbracket",
        "closebracket",
        "minus",
        "equals",
        "grave",
      ]);

      if (allowedKeys.has(key)) {
        socket.emit("keyboard-type", key);
      }
    };

    if (sharedImage) {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
    } else {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("touchstart", handleTouchStart);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [socket, sharedImage]);

  // ENTRA NA SALA DO SOCKET
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinRoom", roomId);
    socket.on("roomNotFound", () => {
      navigate("/");
    });
  }, [roomId, socket]);

  //  ### CONEXÃO HOST E CLIENT PARA STREM DO VIDEO ###
  useEffect(() => {
    if (!socket) return;

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidate);

    socket.on("displayImage", (imageData) => {
      setSharedImage(imageData);
    });

    socket.on("hideImage", () => {
      setSharedImage(null);
    });

    socket.on("stopStream", () => {
      if (userVideoRef.current) {
        setShowVideo(false);
        userVideoRef.current.srcObject = null;
      }
    });

    socket.on("navigate", () => {
      navigate("/");
    });

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleNewICECandidate);
    };
  }, [socket]);

  useEffect(() => {
    if (urlCode) {
      const getObj = decryptObject(decodeURIComponent(urlCode));

      const newSocket = io(getObj?.connectionUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      setRoomId(getObj?.socketRoomId);
      setSocket(newSocket);
    }
  }, [urlCode]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{
        width: "100vw",
        height: "100vh",
        background: showVideo ? "#000000" : "#eee",
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {!showVideo && !sharedImage && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontSize: "3rem",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            Aguarde o Host compartilhar ...
          </p>{" "}
        </div>
      )}

      <video
        style={{
          width: "100vw",
          height: "100vh",
          display: !showVideo && "none",
        }}
        ref={userVideoRef}
        autoPlay
        muted
      ></video>

      {sharedImage && (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
            padding: "2rem",
          }}
        >
          <StyledInput
            value={inputValue}
            handleInputChange={handleInputChange}
          />
          <div
            style={{
              textAlign: "center",
              width: "100%",
              height: "60%",
              backgroundColor: "#000000",
              borderRadius: "2rem",
            }}
          >
            <img
              src={sharedImage}
              alt="Imagem Compartilhada"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
