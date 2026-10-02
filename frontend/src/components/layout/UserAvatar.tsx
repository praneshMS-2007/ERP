'use client';

import { useEffect, useState } from 'react';
import { API_ORIGIN } from '../../services/api';

/** The signed-in person's photo, or their initials when there is no photo (or it fails to load). */
export default function UserAvatar({ name, avatarUrl, className }: { name?: string | null; avatarUrl?: string | null; className: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [avatarUrl]);
  const initials = (name || 'U').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className={className} style={avatarUrl && !broken ? { overflow: 'hidden', padding: 0 } : undefined}>
      {avatarUrl && !broken ? (
        <img
          src={`${API_ORIGIN}${avatarUrl}`}
          alt=""
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
