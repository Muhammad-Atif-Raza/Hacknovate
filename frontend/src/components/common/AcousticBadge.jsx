import React from 'react';
import { VolumeX, Users, Volume2 } from 'lucide-react';

export const AcousticBadge = ({ profile }) => {
  if (profile === 'Silent Study Zone') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <VolumeX className="w-3.5 h-3.5 text-purple-600" />
        Silent Study Zone
      </span>
    );
  }
  if (profile === 'Amplified Sound Permitted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
        Amplified Sound Permitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <Users className="w-3.5 h-3.5 text-blue-600" />
      Collaborative Discussion
    </span>
  );
};
