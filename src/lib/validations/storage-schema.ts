import { StorageTypeValue, type StorageType } from "@/lib/types/storage";
import * as z from "zod";


/**
 * 云存储配置校验 Schema（工厂函数，支持 i18n）
 */
export const createStorageSchema = (t: (key: string) => string) => z.object({
  type: z.enum(StorageTypeValue as [StorageType], {
    required_error: t("ui.validation.storage.typeRequired"),
  }),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  accountId: z.string().optional(),
  bucketName: z.string().optional(),
  accessKeyId: z.string().optional(),
  accessKeySecret: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  customPath: z.string().optional(),
  accessUrlPrefix: z.string().min(1, t("ui.validation.storage.accessUrlPrefixRequired")),
  isEnabled: z
    .union([z.boolean(), z.number()])
    .transform((val) => Boolean(val))
    .default(false)
    .optional(),
})

export type StorageFormData = z.infer<ReturnType<typeof createStorageSchema>>
