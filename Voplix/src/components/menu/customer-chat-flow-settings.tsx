'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyAmount, type ShopCurrency } from '@/lib/currency';
import {
  applyBracketPlaceholders,
  applyTemplate,
  escapeHtml,
  mergeBotTelegramCopy,
  resolveOrderDeliveryFollowupHtml,
} from '@/lib/bot-telegram-copy';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

export type CustomerMsgTemplatesState = {
  product_selected_message_html: string;
  payment_instruction_intro_html: string;
  slip_request_html: string;
  slip_submitted_thanks_html: string;
  bot_paused_message_html: string;
  order_delivery_followup_template_html: string;
};

const SAMPLE = {
  ProductName: 'Netflix ၁ လ (နမူနာ)',
  PriceKey: 12500 as number,
  ShopName: 'ကျွန်ုပ်ဆိုင် (နမူနာ)',
  CustomerName: '@buyer',
};

function isPlainCopy(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function samplesForPreview(currency: ShopCurrency): Record<string, string> {
  return {
    ProductName: SAMPLE.ProductName,
    Price: formatCurrencyAmount(SAMPLE.PriceKey, currency),
    ShopName: SAMPLE.ShopName,
    CustomerName: SAMPLE.CustomerName,
  };
}

function htmlBubbleFromTemplate(template: string, samples: Record<string, string>): string {
  const escaped = Object.fromEntries(
    Object.entries(samples).map(([k, v]) => [k, escapeHtml(v)])
  ) as Record<string, string>;
  const raw = applyBracketPlaceholders(template, escaped);
  return sanitizeOwnerHtml(raw);
}

function PlainPaymentPreview(text: string): string {
  const t = text.trim();
  if (!t) return '';
  const esc = escapeHtml(t).replace(/\n/g, '<br/>');
  return sanitizeOwnerHtml(esc);
}

function TelegramChatChrome({
  botUsername,
  children,
}: {
  botUsername: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const u = botUsername.replace(/^@/, '');
  const initial = (u[0] || '?').toUpperCase();
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-100/90 p-2 dark:border-zinc-700 dark:bg-zinc-950/50">
      <div className="mb-2 flex items-center gap-2 border-b border-zinc-200/80 pb-2 dark:border-zinc-700/80">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-900 dark:text-white">@{u}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{t('Shown as preview')}</p>
        </div>
      </div>
      <div className="max-h-[min(52vh,320px)] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
        {children}
      </div>
    </div>
  );
}

function BotBubble({ html, plainFallback }: { html: string; plainFallback?: string }) {
  const { t } = useLanguage();
  const safe = html.trim() ? html : plainFallback ? sanitizeOwnerHtml(`<span>${escapeHtml(plainFallback)}</span>`) : '';
  return (
    <div className="flex justify-start">
      <div className="max-w-[96%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-2 py-1.5 shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
        {safe ? (
          <div
            className="prose prose-sm max-w-none text-xs leading-relaxed text-zinc-900 prose-p:my-0.5 dark:prose-invert dark:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        ) : (
          <p className="text-[10px] italic text-zinc-500">{t('No message')}</p>
        )}
      </div>
    </div>
  );
}

function BuyerBubble({ text, isPhoto }: { text?: string; isPhoto?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#E3FFD5] px-2 py-1.5 shadow-sm dark:bg-[#2B5278]">
        {isPhoto ? (
          <div className="mb-1 flex h-20 w-28 items-center justify-center rounded-lg bg-black/5 dark:bg-black/20">
            <span className="text-2xl">📸</span>
          </div>
        ) : null}
        {text ? (
          <p className="text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">{text}</p>
        ) : null}
      </div>
    </div>
  );
}

function InlineKeyboardMock({ confirmLabel, cancelLabel }: { confirmLabel: string; cancelLabel: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5 pl-0.5">
      <span className="rounded border border-zinc-300 bg-zinc-200/90 px-2 py-1 text-[10px] font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100">
        {confirmLabel}
      </span>
      <span className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
        {cancelLabel}
      </span>
    </div>
  );
}

function MessageField({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{title}</Label>
        {hint ? <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function PreviewDivider({ children }: { children: React.ReactNode }) {
  return (
    <p className="pl-0.5 pt-1 text-[9px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

export function CustomerChatFlowSettings({
  botUsername,
  telegramCustomerCopy,
  msgTemplates,
  setMsgTemplates,
  paymentInstructions,
  setPaymentInstructions,
  canEdit,
  currency,
}: {
  botUsername: string;
  telegramCustomerCopy: unknown;
  msgTemplates: CustomerMsgTemplatesState;
  setMsgTemplates: React.Dispatch<React.SetStateAction<CustomerMsgTemplatesState>>;
  paymentInstructions: string;
  setPaymentInstructions: (v: string) => void;
  canEdit: boolean;
  currency: ShopCurrency;
}) {
  const { t } = useLanguage();
  const mergedPreview = useMemo(() => {
    const base = isPlainCopy(telegramCustomerCopy) ? { ...telegramCustomerCopy } : {};
    return mergeBotTelegramCopy({ ...base, ...msgTemplates });
  }, [telegramCustomerCopy, msgTemplates]);

  const samples = useMemo(() => samplesForPreview(currency), [currency]);

  const introHtml = htmlBubbleFromTemplate(msgTemplates.payment_instruction_intro_html, samples);
  const paymentPlain = paymentInstructions.trim();
  const slipAskHtml = sanitizeOwnerHtml(mergedPreview.slip_request_html);

  const orderConfirmPreview = useMemo(() => {
    const raw = applyTemplate(mergedPreview.order_confirmed_template_html, {
      product_name: escapeHtml(SAMPLE.ProductName),
      delivery: '',
    });
    return sanitizeOwnerHtml(raw);
  }, [mergedPreview.order_confirmed_template_html]);

  const orderDeliveryPreview = useMemo(() => {
    const sampleLines =
      'KBZ Pay — 09xxxxxxxxx\nWave — 09xxxxxxxxx\nAccount — buyer@example.com';
    const deliveryHtml = escapeHtml(sampleLines).replace(/\n/g, '<br/>');
    const raw = resolveOrderDeliveryFollowupHtml(msgTemplates.order_delivery_followup_template_html, deliveryHtml);
    return sanitizeOwnerHtml(raw);
  }, [msgTemplates.order_delivery_followup_template_html]);

  const ta = 'min-h-[72px] resize-y border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100';
  const taRead = cn(ta, !canEdit && 'cursor-not-allowed opacity-90');

  return (
    <div className="space-y-4 py-1">
      {!canEdit ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">{t('Pro or Plus plan is required to edit texts.')}</p>
          <p className="mt-1 leading-snug">{t('Only default texts can be used in the free plan. However, you can add your payment accounts in number (5) below.')}</p>
          <Link
            href="/subscription"
            className="mt-1.5 inline-block font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            {t('View plans')}
          </Link>
        </div>
      ) : null}

      <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <MessageField
          title={t('1 — Message customer sees when clicking an item')}
          hint={t('The first message that appears when selecting an item from the menu.')}
        >
          <Textarea
            value={msgTemplates.product_selected_message_html}
            onChange={(e) => setMsgTemplates((p) => ({ ...p, product_selected_message_html: e.target.value }))}
            readOnly={!canEdit}
            maxLength={4096}
            rows={3}
            className={taRead}
          />
        </MessageField>

        <MessageField
          title={t('2 — Short message before showing payment account after clicking pay')}
          hint={t('A short message directing the customer where to transfer money.')}
        >
          <Textarea
            value={msgTemplates.payment_instruction_intro_html}
            onChange={(e) => setMsgTemplates((p) => ({ ...p, payment_instruction_intro_html: e.target.value }))}
            readOnly={!canEdit}
            maxLength={4096}
            rows={3}
            className={taRead}
          />
        </MessageField>

        <MessageField
          title={t('3 — Message requesting Slip photo')}
          hint={t('Message requesting to send a payment slip after transferring money.')}
        >
          <Textarea
            value={msgTemplates.slip_request_html}
            onChange={(e) => setMsgTemplates((p) => ({ ...p, slip_request_html: e.target.value }))}
            readOnly={!canEdit}
            maxLength={4096}
            rows={3}
            className={taRead}
          />
        </MessageField>

        <MessageField
          title={t('4 — Thank you message after receiving Slip')}
          hint={t('Message shown immediately after customer sends the payment slip.')}
        >
          <Textarea
            value={msgTemplates.slip_submitted_thanks_html}
            onChange={(e) => setMsgTemplates((p) => ({ ...p, slip_submitted_thanks_html: e.target.value }))}
            readOnly={!canEdit}
            maxLength={4096}
            rows={3}
            className={taRead}
          />
        </MessageField>

        <MessageField
          title={t('5 — Payment numbers and method')}
          hint={t('To enter your bank account numbers such as KBZ, Wave. Customers will see them directly.')}
        >
          <Textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            maxLength={12000}
            rows={4}
            className="min-h-[88px] resize-y border-zinc-300 bg-white text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </MessageField>

        <MessageField
          title={t('6 — Second message after order confirmation')}
          hint={t(
            "Optional wrapper for the message you type when approving on Orders. Leave blank to send only that text. If you write an intro here, put {{delivery}} where the buyer's details should go — or omit it and your intro is still followed by those details automatically."
          )}
        >
          <Textarea
            value={msgTemplates.order_delivery_followup_template_html}
            onChange={(e) =>
              setMsgTemplates((p) => ({ ...p, order_delivery_followup_template_html: e.target.value }))
            }
            readOnly={!canEdit}
            maxLength={4096}
            rows={3}
            className={taRead}
          />
        </MessageField>
      </div>

      <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-white">{t('Preview of what customer will see')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {t('The above texts will be seen as follows.')}
          </p>
        </div>
        <TelegramChatChrome botUsername={botUsername}>
          <BotBubble html={htmlBubbleFromTemplate(msgTemplates.product_selected_message_html, samples)} />
          <InlineKeyboardMock
            confirmLabel={mergedPreview.button_confirm_pay}
            cancelLabel={mergedPreview.button_cancel}
          />
          <PreviewDivider>{t('After customer clicks pay')}</PreviewDivider>
          <BotBubble html={introHtml} />
          {paymentPlain ? (
            <BotBubble html={PlainPaymentPreview(paymentPlain)} />
          ) : (
            <BotBubble
              html=""
              plainFallback={t('Payment numbers not added yet — fill in number 5 above.')}
            />
          )}
          <BotBubble html={slipAskHtml} />
          <PreviewDivider>{t('After customer sends payment slip')}</PreviewDivider>
          <BuyerBubble isPhoto text={t('Money transferred')} />
          <BotBubble html={htmlBubbleFromTemplate(msgTemplates.slip_submitted_thanks_html, samples)} />
          <PreviewDivider>{t('After confirming on Orders page')}</PreviewDivider>
          <BotBubble html={orderConfirmPreview} />
          <BotBubble html={orderDeliveryPreview} />
        </TelegramChatChrome>
      </div>
    </div>
  );
}
