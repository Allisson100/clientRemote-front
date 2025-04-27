import CryptoJS from "crypto-js";

const decryptObject = (encryptedString) => {
  const bytes = CryptoJS.AES.decrypt(
    encryptedString,
    import.meta.env.VITE_SECRET_KEY
  );

  const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

  const decryptedObject = JSON.parse(decryptedString);

  return decryptedObject;
};

export { decryptObject };
