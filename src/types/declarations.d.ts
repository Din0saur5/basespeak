declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    color?: string;
    size?: number;
    style?: TextStyle;
  }

  export const Ionicons: ComponentType<IconProps>;
}
