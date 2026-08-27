import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#171717",
          borderRadius: 6,
        }}
      >
        {[false, true, false, true, false].map((isBlack, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flex: 1,
              margin: "4px 1px",
              borderRadius: 1,
              background: isBlack ? "#171717" : "white",
            }}
          />
        ))}
      </div>
    ),
    size
  );
}
