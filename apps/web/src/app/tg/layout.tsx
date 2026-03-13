export const dynamic = 'force-dynamic'

import { TelegramProvider } from '@/components/telegram/TelegramProvider'
import { BottomTabs } from '@/components/telegram/BottomTabs'

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-background text-foreground antialiased">
        <TelegramProvider>
          <main className="min-h-screen pb-20 px-4 pt-4">
            {children}
          </main>
          <BottomTabs />
        </TelegramProvider>
      </body>
    </html>
  )
}
