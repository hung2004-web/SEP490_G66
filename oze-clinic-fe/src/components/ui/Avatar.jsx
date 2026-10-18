import { cx } from '@/utils/cx';

// Shown when the user has no name yet (e.g. the session was saved without one).
const FALLBACK_INITIAL = '?';

const sizes = {
  md: '',
  lg: 'avatar-lg',
};

// Vietnamese names put the given name last: "Nguyen Van A" -> "A". Returns "" for empty names.
const getInitial = (fullName = '') => {
  const words = (fullName ?? '').normalize('NFC').trim().split(/\s+/).filter(Boolean);
  const lastWord = words.at(-1) ?? '';
  return (Array.from(lastWord)[0] ?? '').toLocaleUpperCase('vi');
};

export const Avatar = ({
  fullName,
  size = 'md',
  className = ''
}) => {
  return (
    <span
      className={cx('avatar', sizes[size], className)}
      title={fullName || undefined}
      aria-hidden="true"
    >
      {getInitial(fullName) || FALLBACK_INITIAL}
    </span>
  );
};

export default Avatar;
