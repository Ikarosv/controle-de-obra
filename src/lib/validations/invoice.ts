// src/lib/validations/invoice.ts
import { z } from "zod";
import { isSplitSumExact } from "@/lib/split-calculator";

export const itemSplitSchema = z.object({
  userId: z.string().min(1, "Selecione o participante"),
  amountDue: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .min(0, "O valor não pode ser negativo"),
  status: z.enum(["PENDING", "PAID"]),
});

export const invoiceItemSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(2, "Descreva o item ou serviço (mín. 2 caracteres)")
      .max(255, "Descrição muito longa"),
    unit: z.string().min(1, "Unidade obrigatória"),
    quantity: z.coerce
      .number({ invalid_type_error: "Informe a quantidade" })
      .positive("A qtd deve ser maior que zero"),
    totalValue: z.coerce
      .number({ invalid_type_error: "Informe o valor do item" })
      .positive("O valor deve ser maior que R$ 0,00"),
    stage: z.string().min(1, "Selecione a etapa da obra"),
    splitModel: z.string().min(1),
    splits: z
      .array(itemSplitSchema)
      .min(1, "Atribua pelo menos um responsável ao rateio deste item"),
  })
  .refine(
    (item) => {
      return isSplitSumExact(item.totalValue, item.splits);
    },
    {
      message:
        "A soma exata em centavos das cotas dos participantes deve ser idêntica ao valor total deste item (diferença zero).",
      path: ["splits"],
    }
  );

export const createInvoiceSchema = z.object({
  documentNumber: z
    .string()
    .trim()
    .min(1, "Informe o nº da NF ou Recibo")
    .max(60, "Máximo de 60 caracteres"),
  supplier: z
    .string()
    .trim()
    .min(2, "Informe o fornecedor ou loja")
    .max(120, "Nome do fornecedor muito longo"),
  date: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Data da compra inválida"),
  categoryId: z.string().min(1, "Selecione a categoria da nota"),
  installments: z.coerce
    .number()
    .int("Deve ser um número inteiro")
    .min(1, "Mínimo 1x (à vista)")
    .max(120, "Máximo 120 parcelas"),
  pixKey: z
    .string()
    .trim()
    .min(3, "Informe a chave PIX para reembolso")
    .max(160, "Chave PIX muito longa"),
  paidBy: z.string().trim().min(1, "Informe quem efetuou o pagamento na loja"),
  observations: z.string().max(1000).optional().or(z.literal("")),
  items: z
    .array(invoiceItemSchema)
    .min(1, "A nota fiscal precisa conter pelo menos 1 item"),
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").toLowerCase(),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(100, "Senha muito longa"),
  role: z.enum(["ADMIN", "PARTICIPANT"]),
  phone: z.string().optional().or(z.literal("")),
  avatarColor: z.string().default("#C26D53"),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria"),
  description: z.string().optional().or(z.literal("")),
  budgetLimit: z.coerce.number().min(0).optional(),
});

export const updateStageBudgetSchema = z.object({
  stage: z.string().min(1),
  budgetLimit: z.coerce.number().min(0, "Orçamento inválido"),
});

export const updateProjectSettingsSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(3, "Informe o nome da obra (mín. 3 caracteres)")
    .max(100, "Nome da obra muito longo"),
  officialPixKey: z
    .string()
    .trim()
    .min(3, "Informe a chave PIX oficial")
    .max(160, "Chave PIX muito longa"),
  pixReceiverName: z
    .string()
    .trim()
    .min(2, "Informe o nome do titular do PIX")
    .max(100, "Nome do titular muito longo"),
  applyToPendingInvoices: z.boolean().optional().default(false),
  updatePendingInvoicesPix: z.boolean().optional(),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword: z
    .string()
    .min(6, "A nova senha deve ter no mínimo 6 caracteres")
    .max(100, "A nova senha é muito longa"),
});

export const adminResetPasswordSchema = z.object({
  targetUserId: z.string().min(1, "Usuário inválido"),
  newPassword: z
    .string()
    .min(6, "A nova senha deve ter no mínimo 6 caracteres")
    .max(100, "A nova senha é muito longa"),
});

export const deleteUserSchema = z.object({
  targetUserId: z.string().min(1, "Usuário inválido"),
});

export const reportPaymentNoticeSchema = z.object({
  splitId: z.string().min(1, "Cota inválida"),
  note: z
    .string()
    .trim()
    .min(2, "Informe uma observação ou data do PIX")
    .max(240, "Observação muito longa"),
});

export const reportAllPendingNoticeSchema = z.object({
  note: z
    .string()
    .trim()
    .min(2, "Informe uma observação ou data do PIX")
    .max(240, "Observação muito longa"),
});
