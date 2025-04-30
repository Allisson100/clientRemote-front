import { TextField } from "@mui/material";

const StyledInput = ({ inputValue, handleInputChange }) => {
  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <TextField
        placeholder="Digite ..."
        fullWidth
        multiline
        minRows={7}
        maxRows={7}
        value={inputValue}
        onChange={handleInputChange}
      />
    </div>
  );
};

export default StyledInput;
