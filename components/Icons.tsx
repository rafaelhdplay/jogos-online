import React from 'react';
import { RefreshCw, User, Cpu, HelpCircle, Volume2, Trophy, Eraser, Settings, Trash2, VolumeX, Wifi, Copy, Share2, LogOut } from 'lucide-react';

export const ResetIcon = ({ className }: { className?: string }) => <RefreshCw className={className} />;
export const UserIcon = ({ className }: { className?: string }) => <User className={className} />;
export const CpuIcon = ({ className }: { className?: string }) => <Cpu className={className} />;
export const HelpIcon = ({ className }: { className?: string }) => <HelpCircle className={className} />;
export const VolumeIcon = ({ className }: { className?: string }) => <Volume2 className={className} />;
export const VolumeOffIcon = ({ className }: { className?: string }) => <VolumeX className={className} />;
export const TrophyIcon = ({ className }: { className?: string }) => <Trophy className={className} />;
export const EraserIcon = ({ className }: { className?: string }) => <Eraser className={className} />;
export const TrashIcon = ({ className, onClick, title }: { className?: string; onClick?: () => void; title?: string }) => <Trash2 className={className} onClick={onClick} title={title} />;
export const SettingsIcon = ({ className, onClick }: { className?: string; onClick?: () => void }) => <Settings className={className} onClick={onClick} />;
export const WifiIcon = ({ className }: { className?: string }) => <Wifi className={className} />;
export const CopyIcon = ({ className }: { className?: string }) => <Copy className={className} />;
export const ShareIcon = ({ className }: { className?: string }) => <Share2 className={className} />;
export const ExitIcon = ({ className }: { className?: string }) => <LogOut className={className} />;