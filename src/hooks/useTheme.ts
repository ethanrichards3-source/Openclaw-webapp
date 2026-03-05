import { useStore } from '../store';
import { themes, ThemeColors } from '../config/theme';

export function useTheme(): { colors: ThemeColors; name: string } {
  const theme = useStore(s => s.config.theme);
  return {
    colors: themes[theme].colors,
    name: themes[theme].name,
  };
}
