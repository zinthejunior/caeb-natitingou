import { useEffect, useState, useCallback } from "react";
import { useTheme } from "./useTheme";
import {
  getAdaptiveTextColor,
  getAdaptiveTextColorWithContrast,
  getColorInfo
} from "@/lib/contrast";
export function useAdaptiveTextColor(backgroundColor, isLargeText = false) {
  const { isDark, mounted } = useTheme();
  const [textColor, setTextColor] = useState("#000000");
  const [contrastInfo, setContrastInfo] = useState({ contrastRatio: 0, meetsWCAG: false });
  useEffect(() => {
    if (!mounted) return;
    const result = getAdaptiveTextColorWithContrast(
      backgroundColor,
      isDark,
      isLargeText
    );
    setTextColor(result.color);
    setContrastInfo({
      contrastRatio: result.contrastRatio,
      meetsWCAG: result.meetsWCAG
    });
  }, [backgroundColor, isDark, isLargeText, mounted]);
  return {
    textColor,
    contrastRatio: contrastInfo.contrastRatio,
    meetsWCAG: contrastInfo.meetsWCAG
  };
}
export function useAdaptiveTextColorAdvanced(backgroundColor, isLargeText = false) {
  const { isDark, mounted } = useTheme();
  const [color, setColor] = useState("#000000");
  const [info, setInfo] = useState(
    getColorInfo(backgroundColor, false)
  );
  useEffect(() => {
    if (!mounted) return;
    const newInfo = getColorInfo(backgroundColor, isDark);
    console.log("useAdaptiveTextColorAdvanced isLargeText:", isLargeText);
    setInfo(newInfo);
    setColor(newInfo.color);
  }, [backgroundColor, isDark, mounted]);
  const getHoverColor = useCallback(() => {
    return color;
  }, [color]);
  const getFocusColor = useCallback(() => {
    return color;
  }, [color]);
  const getActiveColor = useCallback(() => {
    return color;
  }, [color]);
  const getDisabledColor = useCallback(() => {
    return `${color}80`;
  }, [color]);
  return {
    ...info,
    getHoverColor,
    getFocusColor,
    getActiveColor,
    getDisabledColor
  };
}
export function useAdaptiveTextColorBatch(backgrounds) {
  const { isDark, mounted } = useTheme();
  const [colors, setColors] = useState(
    backgrounds.map(() => "#000000")
  );
  const getColors = useCallback(() => {
    return backgrounds.map((bg) => getAdaptiveTextColor(bg, isDark));
  }, [backgrounds, isDark]);
  useEffect(() => {
    if (!mounted) return;
    setColors(getColors());
  }, [mounted, getColors]);
  return colors;
}
