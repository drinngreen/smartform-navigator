import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email'),
  name: text('name'),
  createdAt: integer('created_at')
})

export const certificates = sqliteTable('certificates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subject: text('subject'),
  issuer: text('issuer'),
  thumbprint: text('thumbprint'),
  validTo: integer('valid_to')
})

export const fir_files = sqliteTable('fir_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero'),
  data: text('data'),
  xmlContent: text('xml_content'),
  status: text('status'),
  filename: text('filename'),
  companyP12: text('company_p12'),
  uploadDate: integer('upload_date'),
  createdAt: integer('created_at'),
  errorMessage: text('error_message')
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firId: integer('fir_id'),
  status: text('status'),
  createdAt: integer('created_at'),
  signedXml: text('signed_xml'),
  rentriResponse: text('rentri_response'),
  timestamp: integer('timestamp', { mode: 'timestamp' })
})

// Tabella FIR attuale, mantenuta per compatibilità con la logica esistente
export const fir = sqliteTable('fir', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero'),
  data: text('data'),
  xmlContent: text('xml_content'),
  status: text('status'),
  filename: text('filename'),
  companyP12: text('company_p12'),
  uploadDate: integer('upload_date')
})