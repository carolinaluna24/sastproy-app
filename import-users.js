import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import csv from 'csv-parser'

const supabaseUrl = 'https://lsvtxagvaktvdgqhrpqw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdnR4YWd2YWt0dmRncWhycHF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0NTEyMywiZXhwIjoyMDg3MDIxMTIzfQ.Tvx734QtNnvMb5W_Ql2nd0UwtUSFwbgz4ular1xnbSg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const PASSWORD = 'Clave1234'

async function importUsers() {
  const users = []

  fs.createReadStream('auth_users.csv')
    .pipe(csv())
    .on('data', (row) => users.push(row))
    .on('end', async () => {
      for (const user of users) {

        const { error } = await supabase.auth.admin.createUser({
          id: user.id, // 👈 usamos el UID del CSV
          email: user.email.trim(),
          password: PASSWORD,
          email_confirm: true
        })

        if (error) {
          console.error(`❌ ${user.email}: ${error.message}`)
        } else {
          console.log(`✅ Creado: ${user.email}`)
        }
      }

      console.log('🎉 Importación finalizada')
    })
}

importUsers()