import {useSelector} from 'react-redux';
import {RootState} from '../store/store';
import {getTheme, Theme} from '../theme/themes';

export const useTheme = (): Theme => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  return getTheme(mode);
};
