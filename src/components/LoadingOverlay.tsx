import React from "react";

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  small?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Carregando...",
  fullScreen = false,
  small = false,
}) => {
  return (
    <div className={`loading-overlay ${fullScreen ? "full-screen" : ""} fade-in`}>
      <div className={`loading-spinner ${small ? "small" : ""}`} />
      {message && <div className="loading-text">{message}</div>}
    </div>
  );
};

export default LoadingOverlay;
