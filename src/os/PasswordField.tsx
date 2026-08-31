/**
 * A masked input for the IN-GAME (fictional) logins that will NOT summon a
 * browser's password-manager overlays — Chrome/Safari's autofill dropdown,
 * the key icon, the "save password?" bubble. Those modern chrome bits shatter
 * the 1997 illusion the moment the machine boots.
 *
 * The trick: it is not a `type="password"` field at all, so the browser never
 * treats it as credentials. It's a plain text input masked with
 * `-webkit-text-security` (Chrome/Safari/Edge), plus autocomplete off.
 *
 * ONLY for the fiction (the Horizons logon, the Solitaire backdoor, the
 * dial-up field). The real player sign-in (AuthGate) keeps a true password
 * field so password managers work there, as they should.
 */
import styled from 'styled-components';
import { TextInput } from 'react95';
import type { ComponentProps } from 'react';

const Wrap = styled.div`
  flex: 1;
  min-width: 0;
  /* Mask the value like a password without BEING a password field. */
  input {
    -webkit-text-security: disc;
  }
`;

type TextInputProps = ComponentProps<typeof TextInput>;

export function PasswordField(props: TextInputProps) {
  // Not a password field (no browser overlays), masked via CSS instead.
  const masked = {
    ...props,
    type: 'text',
    fullWidth: true,
    autoComplete: 'off',
    spellCheck: false,
  } as TextInputProps;
  return (
    <Wrap>
      <TextInput {...masked} />
    </Wrap>
  );
}
