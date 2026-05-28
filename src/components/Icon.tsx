import React from 'react';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';
import { colors } from '../lib/tokens';

export type IconName =
  | 'home' | 'cal' | 'bell' | 'timer' | 'user' | 'users' | 'plus' | 'arrow'
  | 'chev' | 'chevDown' | 'chevUp' | 'chevLeft' | 'play' | 'pause' | 'reset'
  | 'check' | 'x' | 'sun' | 'moon' | 'pin' | 'run' | 'cart' | 'coffee'
  | 'settings' | 'bolt' | 'flag' | 'headphones' | 'lock' | 'unlock' | 'eye'
  | 'eyeOff' | 'dots' | 'search' | 'repeat' | 'note' | 'book' | 'message';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, color = colors.fg1, strokeWidth = 1.6 }: IconProps) {
  const props = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    home:       <><Path {...props} d="M3 11.5 12 4l9 7.5"/><Path {...props} d="M5 10v10h14V10"/></>,
    cal:        <><Rect {...props} x="3.5" y="5" width="17" height="15" rx="2"/><Path {...props} d="M3.5 9.5h17M8 3v4M16 3v4"/></>,
    bell:       <><Path {...props} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z"/><Path {...props} d="M10 20a2 2 0 0 0 4 0"/></>,
    timer:      <><Circle {...props} cx="12" cy="13" r="7.5"/><Path {...props} d="M12 9v4M9.5 3.5h5M16.5 7l1.5-1.5"/></>,
    user:       <><Circle {...props} cx="12" cy="8" r="3.5"/><Path {...props} d="M5 20c1.2-3.8 4-5 7-5s5.8 1.2 7 5"/></>,
    users:      <><Circle {...props} cx="9" cy="8" r="3"/><Path {...props} d="M3 20c.9-3 3.4-4.2 6-4.2s5.1 1.2 6 4.2"/><Circle {...props} cx="17" cy="8" r="2.5"/><Path {...props} d="M15 13.5c2-.2 4.2.8 5 3.5"/></>,
    plus:       <Path {...props} d="M12 5v14M5 12h14"/>,
    arrow:      <><Path {...props} d="M5 12h14"/><Path {...props} d="m13 6 6 6-6 6"/></>,
    chev:       <Path {...props} d="m9 6 6 6-6 6"/>,
    chevDown:   <Path {...props} d="m6 9 6 6 6-6"/>,
    chevUp:     <Path {...props} d="m18 15-6-6-6 6"/>,
    chevLeft:   <Path {...props} d="m15 6-6 6 6 6"/>,
    play:       <Path fill={color} strokeWidth={0} d="M8 5v14l11-7z"/>,
    pause:      <><Rect fill={color} strokeWidth={0} x="6.5" y="5" width="3.5" height="14"/><Rect fill={color} strokeWidth={0} x="14" y="5" width="3.5" height="14"/></>,
    reset:      <><Path {...props} d="M4 11a8 8 0 1 1 2.6 5.9"/><Path {...props} d="M4 5v6h6"/></>,
    check:      <Path {...props} d="m5 12.5 4.5 4.5L19 7"/>,
    x:          <Path {...props} d="M6 6l12 12M18 6 6 18"/>,
    sun:        <><Circle {...props} cx="12" cy="12" r="4"/><Path {...props} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></>,
    moon:       <Path {...props} d="M20 14.5A8 8 0 1 1 9.5 4 6 6 0 0 0 20 14.5z"/>,
    pin:        <><Path {...props} d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><Circle {...props} cx="12" cy="9" r="2.5"/></>,
    run:        <><Circle {...props} cx="14" cy="5" r="2"/><Path {...props} d="M5 13l3-3 3 1 2 4 4 1M9 21l2-4-3-2"/></>,
    cart:       <><Path {...props} d="M3 5h2l2.5 11h11l2-7H7"/><Circle {...props} cx="9.5" cy="20" r="1.2"/><Circle {...props} cx="17" cy="20" r="1.2"/></>,
    coffee:     <><Path {...props} d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><Path {...props} d="M17 10h2.5a2.5 2.5 0 0 1 0 5H17M8 4v2M11.5 3v3"/></>,
    settings:   <><Circle {...props} cx="12" cy="12" r="3"/><Path {...props} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.4.6 1 .9 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    bolt:       <Path {...props} d="M13 3 4 14h6l-1 7 9-11h-6l1-7z"/>,
    flag:       <><Path {...props} d="M5 21V4M5 4h12l-2 4 2 4H5"/></>,
    headphones: <><Path {...props} d="M4 14v-2a8 8 0 0 1 16 0v2"/><Rect {...props} x="3" y="13" width="4" height="7" rx="1.5"/><Rect {...props} x="17" y="13" width="4" height="7" rx="1.5"/></>,
    lock:       <><Rect {...props} x="5" y="11" width="14" height="9" rx="2"/><Path {...props} d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    unlock:     <><Rect {...props} x="5" y="11" width="14" height="9" rx="2"/><Path {...props} d="M8 11V8a4 4 0 0 1 7.5-2"/></>,
    eye:        <><Path {...props} d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><Circle {...props} cx="12" cy="12" r="3"/></>,
    eyeOff:     <><Path {...props} d="M3 3l18 18M10.5 6.2A10 10 0 0 1 12 6c6.5 0 10.5 7 10.5 7a17 17 0 0 1-3.5 4M6 7.5A18 18 0 0 0 1.5 13s4 7 10.5 7c1.8 0 3.4-.4 4.8-1"/><Path {...props} d="M9.7 9.7a3 3 0 0 0 4.6 4.6"/></>,
    dots:       <><Circle fill={color} strokeWidth={0} cx="12" cy="6"  r="1.4"/><Circle fill={color} strokeWidth={0} cx="12" cy="12" r="1.4"/><Circle fill={color} strokeWidth={0} cx="12" cy="18" r="1.4"/></>,
    search:     <><Circle {...props} cx="11" cy="11" r="6.5"/><Path {...props} d="m20 20-4-4"/></>,
    repeat:     <><Path {...props} d="M17 4l4 4-4 4M3 12V9a4 4 0 0 1 4-4h13"/><Path {...props} d="M7 20l-4-4 4-4M21 12v3a4 4 0 0 1-4 4H4"/></>,
    note:       <><Path {...props} d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><Path {...props} d="M13 3v5h5M8 13h8M8 17h5"/></>,
    book:       <><Path {...props} d="M4 4h7a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><Path {...props} d="M20 4h-5a4 4 0 0 0-4 4v12h5a4 4 0 0 0 4-4V4z"/></>,
    message:    <Path {...props} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </Svg>
  );
}
