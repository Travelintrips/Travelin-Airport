import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWheelchair,
  faGolfBallTee,
  faWater, // alternatif surfing
} from "@fortawesome/free-solid-svg-icons";

// FontAwesome Icon
export const WheelchairIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon
    icon={faWheelchair}
    className={className || "text-gray-600 h-8 w-8"}
  />
);

// SVG Custom Icons
export const GolfIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/golf.svg"
    alt="Golf Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const SurfingIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/surfboard.svg"
    alt="Surfboard Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const CameraIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/camera.svg"
    alt="Camera Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const LaptopIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/laptop.svg"
    alt="Laptop Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const GuitarIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/guitar.svg"
    alt="Guitar Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const KeyboardIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/keyboard.svg"
    alt="Keyboard Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const JoinedIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/joined.svg"
    alt="Joined Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const CashIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/cash-money.svg"
    alt="Cash Money"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const PaylabsIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/Paylabs.png"
    alt="paylabs"
    className={className || "h-8 w-8 object-contain"}
  />
);
