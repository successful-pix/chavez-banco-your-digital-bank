import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "pt-BR" | "en";

type Dict = Record<string, string>;

const pt: Dict = {
  "app.name": "Chavez Banco",
  "app.tagline": "Banco digital premium do Brasil",
  "nav.home": "Início",
  "nav.transfer": "Transferir",
  "nav.cards": "Meus Cartões",
  "nav.profile": "Perfil",
  "nav.support": "Suporte",
  "nav.signin": "Entrar",
  "nav.signup": "Abrir Conta",
  "nav.signout": "Sair",
  "lang.switch": "Idioma",

  "landing.hero.title": "O banco digital que valoriza você",
  "landing.hero.subtitle": "Conta corrente, PIX, transferências e cartões. Tudo em um só lugar, com segurança de nível bancário.",
  "landing.cta.primary": "Abrir conta grátis",
  "landing.cta.secondary": "Já sou cliente",
  "landing.feature.pix.title": "PIX Instantâneo",
  "landing.feature.pix.desc": "Envie e receba dinheiro em segundos, 24/7.",
  "landing.feature.cards.title": "Cartões Premium",
  "landing.feature.cards.desc": "Físico e virtual, com controle total pelo app.",
  "landing.feature.security.title": "Segurança Bancária",
  "landing.feature.security.desc": "Verificação facial e criptografia ponta a ponta.",

  "auth.tabs.signin": "Entrar",
  "auth.tabs.signup": "Criar conta",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.password.confirm": "Confirmar senha",
  "auth.fullname": "Nome completo",
  "auth.phone": "Telefone (BR)",
  "auth.cpf": "CPF ou RG",
  "auth.dob": "Data de nascimento",
  "auth.photo": "Foto de perfil",
  "auth.signin.button": "Entrar",
  "auth.signup.button": "Criar conta",
  "auth.forgot": "Esqueceu a senha?",
  "auth.face.title": "Verificação facial",
  "auth.face.instruction": "Sorria para a câmera para ativar sua conta.",
  "auth.face.start": "Iniciar câmera",
  "auth.face.detecting": "Detectando sorriso...",
  "auth.face.success": "Sorriso detectado!",
  "auth.face.retry": "Tentar novamente",
  "auth.face.loading": "Carregando modelos de IA...",
  "auth.face.no_smile": "Não detectamos um sorriso. Tente novamente.",
  "auth.password.mismatch": "As senhas não conferem.",
  "auth.password.min": "A senha deve ter no mínimo 8 caracteres.",
  "auth.check.email": "Confira seu e-mail para verificar sua conta.",
  "auth.reset.title": "Redefinir senha",
  "auth.reset.new": "Nova senha",
  "auth.reset.button": "Atualizar senha",
  "auth.reset.sent": "Enviamos um link para seu e-mail.",
  "auth.forgot.title": "Recuperar senha",
  "auth.forgot.button": "Enviar link de recuperação",
  "auth.error.generic": "Não foi possível processar. Tente novamente.",

  "dashboard.hello": "Olá",
  "dashboard.balance": "Saldo disponível",
  "dashboard.show": "Mostrar",
  "dashboard.hide": "Ocultar",
  "dashboard.agencia": "Agência",
  "dashboard.account": "Conta",
  "dashboard.pix": "Chave PIX",
  "dashboard.type": "Tipo",
  "dashboard.currency": "Moeda",
  "dashboard.country": "País",
  "dashboard.swift": "SWIFT",
  "dashboard.qa.pix": "PIX",
  "dashboard.qa.transfer": "Transferir",
  "dashboard.qa.qr": "QR Pagamento",
  "dashboard.qa.cards": "Cartões",
  "dashboard.recent": "Transações recentes",
  "dashboard.empty": "Nenhuma transação ainda.",
  "dashboard.copy": "Copiar",
  "dashboard.copied": "Copiado!",

  "transfer.title": "Nova transferência",
  "transfer.type": "Tipo de transferência",
  "transfer.type.pix": "PIX",
  "transfer.type.ted": "TED",
  "transfer.type.doc": "DOC",
  "transfer.type.internal": "Interna Chavez",
  "transfer.recipient.name": "Nome do favorecido",
  "transfer.bank": "Banco",
  "transfer.agencia": "Agência",
  "transfer.account": "Conta",
  "transfer.pixkey": "Chave PIX",
  "transfer.amount": "Valor (R$)",
  "transfer.description": "Descrição",
  "transfer.submit": "Enviar transferência",
  "transfer.saving": "Processando...",
  "transfer.success": "Transferência realizada com sucesso!",
  "transfer.insufficient": "Saldo insuficiente.",
  "transfer.view_receipt": "Ver recibo",

  "receipt.title": "Comprovante",
  "receipt.type": "Tipo",
  "receipt.amount": "Valor",
  "receipt.date": "Data",
  "receipt.time": "Hora",
  "receipt.reference": "Referência",
  "receipt.status": "Status",
  "receipt.status.completed": "Concluído",
  "receipt.status.pending": "Pendente",
  "receipt.status.failed": "Falhou",
  "receipt.status.cancelled": "Cancelado",
  "receipt.status.rejected": "Rejeitado",
  "receipt.from": "Origem",
  "receipt.to": "Destino",
  "receipt.reason": "Motivo",
  "receipt.print": "Imprimir",
  "receipt.download": "Baixar",
  "receipt.back": "Voltar",
  "receipt.notfound": "Comprovante não encontrado.",

  "tx.deposit": "Depósito",
  "tx.pix": "PIX",
  "tx.ted": "TED",
  "tx.doc": "DOC",
  "tx.internal": "Transferência interna",
  "tx.withdrawal": "Saque",
  "tx.international_transfer": "Transferência internacional",

  "common.cancel": "Cancelar",
  "common.save": "Salvar",
  "common.loading": "Carregando...",
};

const en: Dict = {
  "app.name": "Chavez Banco",
  "app.tagline": "Premium digital banking from Brazil",
  "nav.home": "Home",
  "nav.transfer": "Transfer",
  "nav.cards": "My Cards",
  "nav.profile": "Profile",
  "nav.support": "Support",
  "nav.signin": "Sign in",
  "nav.signup": "Open Account",
  "nav.signout": "Sign out",
  "lang.switch": "Language",

  "landing.hero.title": "Banking that puts you first",
  "landing.hero.subtitle": "Checking, PIX, transfers and cards — all in one place, with bank-grade security.",
  "landing.cta.primary": "Open free account",
  "landing.cta.secondary": "I'm already a client",
  "landing.feature.pix.title": "Instant PIX",
  "landing.feature.pix.desc": "Send and receive money in seconds, 24/7.",
  "landing.feature.cards.title": "Premium cards",
  "landing.feature.cards.desc": "Physical and virtual, fully controlled from the app.",
  "landing.feature.security.title": "Bank-grade security",
  "landing.feature.security.desc": "Face verification and end-to-end encryption.",

  "auth.tabs.signin": "Sign in",
  "auth.tabs.signup": "Create account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.password.confirm": "Confirm password",
  "auth.fullname": "Full name",
  "auth.phone": "Phone (BR)",
  "auth.cpf": "CPF or National ID",
  "auth.dob": "Date of birth",
  "auth.photo": "Profile photo",
  "auth.signin.button": "Sign in",
  "auth.signup.button": "Create account",
  "auth.forgot": "Forgot password?",
  "auth.face.title": "Face verification",
  "auth.face.instruction": "Smile at the camera to activate your account.",
  "auth.face.start": "Start camera",
  "auth.face.detecting": "Detecting smile...",
  "auth.face.success": "Smile detected!",
  "auth.face.retry": "Try again",
  "auth.face.loading": "Loading AI models...",
  "auth.face.no_smile": "No smile detected. Please try again.",
  "auth.password.mismatch": "Passwords do not match.",
  "auth.password.min": "Password must be at least 8 characters.",
  "auth.check.email": "Check your inbox to verify your account.",
  "auth.reset.title": "Reset password",
  "auth.reset.new": "New password",
  "auth.reset.button": "Update password",
  "auth.reset.sent": "We sent a reset link to your email.",
  "auth.forgot.title": "Recover password",
  "auth.forgot.button": "Send recovery link",
  "auth.error.generic": "Something went wrong. Please try again.",

  "dashboard.hello": "Hello",
  "dashboard.balance": "Available balance",
  "dashboard.show": "Show",
  "dashboard.hide": "Hide",
  "dashboard.agencia": "Branch",
  "dashboard.account": "Account",
  "dashboard.pix": "PIX key",
  "dashboard.type": "Type",
  "dashboard.currency": "Currency",
  "dashboard.country": "Country",
  "dashboard.swift": "SWIFT",
  "dashboard.qa.pix": "PIX",
  "dashboard.qa.transfer": "Transfer",
  "dashboard.qa.qr": "QR Pay",
  "dashboard.qa.cards": "Cards",
  "dashboard.recent": "Recent transactions",
  "dashboard.empty": "No transactions yet.",
  "dashboard.copy": "Copy",
  "dashboard.copied": "Copied!",

  "transfer.title": "New transfer",
  "transfer.type": "Transfer type",
  "transfer.type.pix": "PIX",
  "transfer.type.ted": "TED",
  "transfer.type.doc": "DOC",
  "transfer.type.internal": "Chavez internal",
  "transfer.recipient.name": "Recipient name",
  "transfer.bank": "Bank",
  "transfer.agencia": "Branch",
  "transfer.account": "Account",
  "transfer.pixkey": "PIX key",
  "transfer.amount": "Amount (BRL)",
  "transfer.description": "Description",
  "transfer.submit": "Send transfer",
  "transfer.saving": "Processing...",
  "transfer.success": "Transfer completed successfully!",
  "transfer.insufficient": "Insufficient balance.",
  "transfer.view_receipt": "View receipt",

  "receipt.title": "Receipt",
  "receipt.type": "Type",
  "receipt.amount": "Amount",
  "receipt.date": "Date",
  "receipt.time": "Time",
  "receipt.reference": "Reference",
  "receipt.status": "Status",
  "receipt.status.completed": "Completed",
  "receipt.status.pending": "Pending",
  "receipt.status.failed": "Failed",
  "receipt.status.cancelled": "Cancelled",
  "receipt.status.rejected": "Rejected",
  "receipt.from": "From",
  "receipt.to": "To",
  "receipt.reason": "Reason",
  "receipt.print": "Print",
  "receipt.download": "Download",
  "receipt.back": "Back",
  "receipt.notfound": "Receipt not found.",

  "tx.deposit": "Deposit",
  "tx.pix": "PIX",
  "tx.ted": "TED",
  "tx.doc": "DOC",
  "tx.internal": "Internal transfer",
  "tx.withdrawal": "Withdrawal",
  "tx.international_transfer": "International transfer",

  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.loading": "Loading...",
};

const DICTS: Record<Lang, Dict> = { "pt-BR": pt, en };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt-BR");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("chavez.lang") : null;
    if (saved === "pt-BR" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("chavez.lang", l);
  };

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (key: string) => DICTS[lang][key] ?? DICTS["pt-BR"][key] ?? key,
  }), [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
