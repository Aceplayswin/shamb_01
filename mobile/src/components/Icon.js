import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SETS = {
  ion: Ionicons,
  mci: MaterialCommunityIcons,
};

export function Icon({ name, set = 'ion', size = 22, color = '#fff', style }) {
  const Component = SETS[set] ?? Ionicons;
  return <Component name={name} size={size} color={color} style={style} />;
}
