import { useState, type FormEvent } from 'react';
import { createGreenApiClient, GreenApiError, normalizeApiUrl } from '../../api/greenApiClient';
import type { Credentials, InstanceState } from '../../api/types';
import { detectInstanceType } from '../../domain/instance';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore } from '../../store/sessionStore';
import { Button } from '../ui/Button';
import { BrandLogo, EyeIcon, EyeOffIcon } from '../ui/icons';
import { TextField } from '../ui/TextField';
import styles from './LoginScreen.module.css';

type FieldErrors = Partial<Record<keyof Credentials, string>>;

const STATE_ERRORS: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован: отсканируйте QR-код в личном кабинете GREEN-API',
  blocked: 'Аккаунт мессенджера заблокирован',
  starting: 'Инстанс запускается, повторите попытку через пару минут',
  suspended: 'Отправка сообщений временно ограничена',
  pendingPassword: 'Инстанс ожидает ввода облачного пароля в личном кабинете',
};

function validate({ idInstance, apiTokenInstance, apiUrl }: Credentials): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^\d+$/.test(idInstance)) errors.idInstance = 'idInstance состоит только из цифр';
  if (apiTokenInstance.length < 10) errors.apiTokenInstance = 'Введите apiTokenInstance';
  if (apiUrl === '') errors.apiUrl = 'Укажите apiUrl из личного кабинета';
  else if (!URL.canParse(apiUrl) || !apiUrl.startsWith('https://')) {
    errors.apiUrl = 'Адрес должен начинаться с https://';
  }
  return errors;
}

export function LoginScreen() {
  const login = useSessionStore((s) => s.login);
  const [form, setForm] = useState<Credentials>({
    idInstance: '',
    apiTokenInstance: '',
    apiUrl: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const updateField = (field: keyof Credentials) => (event: { target: { value: string } }) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credentials: Credentials = {
      idInstance: form.idInstance.trim(),
      apiTokenInstance: form.apiTokenInstance.trim(),
      apiUrl: normalizeApiUrl(form.apiUrl),
    };
    const errors = validate(credentials);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const client = createGreenApiClient(credentials);
      const [{ stateInstance }, { typeInstance }] = await Promise.all([
        client.getStateInstance(),
        client.getSettings(),
      ]);
      const instanceType = detectInstanceType(typeInstance);
      if (!instanceType) {
        setFormError(`Поддерживаются инстансы MAX и Telegram, а этот — «${typeInstance ?? '?'}»`);
      } else if (stateInstance === 'authorized') {
        useChatStore.getState().bindOwner(credentials.idInstance);
        login({ credentials, instanceType });
        return;
      } else {
        setFormError(STATE_ERRORS[stateInstance] ?? `Инстанс в состоянии «${stateInstance}»`);
      }
    } catch (error) {
      if (error instanceof GreenApiError && error.status === 0) {
        // Чужой или неверный хост отвечает без CORS-заголовков — браузер видит это как сбой сети.
        setFormError(
          `Не удалось подключиться к ${new URL(credentials.apiUrl).host}. Проверьте apiUrl — он указан в личном кабинете рядом с idInstance.`,
        );
      } else {
        setFormError(error instanceof GreenApiError ? error.message : 'Не удалось войти');
      }
    }
    setIsSubmitting(false);
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <BrandLogo size={64} />
        <h1 className={styles.title}>Вход через GREEN-API</h1>
        <p className={styles.subtitle}>
          Введите параметры инстанса MAX или Telegram из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <div className={styles.fields}>
          <TextField
            label="apiUrl"
            name="apiUrl"
            type="url"
            inputMode="url"
            spellCheck={false}
            placeholder="https://7103.api.greenapi.com"
            value={form.apiUrl}
            onChange={updateField('apiUrl')}
            error={fieldErrors.apiUrl}
            autoFocus
          />
          <TextField
            label="idInstance"
            name="idInstance"
            inputMode="numeric"
            autoComplete="username"
            placeholder="7103000000"
            value={form.idInstance}
            onChange={updateField('idInstance')}
            error={fieldErrors.idInstance}
          />
          <TextField
            label="apiTokenInstance"
            name="apiTokenInstance"
            type={isTokenVisible ? 'text' : 'password'}
            autoComplete="current-password"
            spellCheck={false}
            placeholder="•••••••••••••••••"
            value={form.apiTokenInstance}
            onChange={updateField('apiTokenInstance')}
            error={fieldErrors.apiTokenInstance}
            trailing={
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setIsTokenVisible((v) => !v)}
                aria-label={isTokenVisible ? 'Скрыть токен' : 'Показать токен'}
                aria-pressed={isTokenVisible}
              >
                {isTokenVisible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            }
          />
        </div>

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Войти
        </Button>
      </form>
    </main>
  );
}
