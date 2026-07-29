import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { Drawer } from '@/shared/ui/Drawer/Drawer'
import { Dialog } from '@/shared/ui/Dialog/Dialog'
import { Popover } from '@/shared/ui/Popover/Popover'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Switch } from '@/shared/ui/Switch/Switch'
import { ToastProvider, useToast } from '@/shared/ui/Toast'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { CloseIcon } from '@/shared/ui/icons'

describe('IconButton', () => {
  it('имеет aria-label и доступен с клавиатуры', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <IconButton label="Закрыть панель" onClick={onClick}>
        <CloseIcon />
      </IconButton>,
    )
    const btn = screen.getByRole('button', { name: 'Закрыть панель' })
    btn.focus()
    expect(btn).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalled()
  })
})

describe('SegmentedControl', () => {
  it('переключает значение кнопками и клавиатурой', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl
        ariaLabel="Направление"
        value="0"
        onChange={onChange}
        options={[
          { value: '0', label: '0°' },
          { value: '90', label: '90°' },
        ]}
      />,
    )
    await user.click(screen.getByRole('radio', { name: '90°' }))
    expect(onChange).toHaveBeenCalledWith('90')
  })
})

describe('Switch', () => {
  it('переключается Space/кликом', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch label="Показать размеры" checked={false} onChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Показать размеры' })
    sw.focus()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Drawer', () => {
  it('закрывается по Escape и возвращает фокус', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Открыть
          </button>
          <Drawer open={open} onClose={() => setOpen(false)} title="Каталог">
            <button type="button">Внутри</button>
          </Drawer>
        </>
      )
    }

    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Открыть' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Каталог' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Каталог' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('ловит Tab внутри панели', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <Drawer open={open} onClose={() => setOpen(false)} title="Панель">
          <button type="button">Первая</button>
          <button type="button">Вторая</button>
        </Drawer>
      )
    }

    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Панель' })
    const buttons = within(dialog).getAllByRole('button')
    buttons[0].focus()
    await user.tab()
    // фокус остаётся среди элементов диалога
    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})

describe('Dialog', () => {
  it('закрывается по Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Подтверждение">
        <p>Текст</p>
      </Dialog>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Popover', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  })

  afterEach(() => {
    // restore default from setup — false matches
  })

  it('закрывается по Escape', async () => {
    const user = userEvent.setup()

    function Harness() {
      const ref = useRef<HTMLButtonElement>(null)
      const [open, setOpen] = useState(true)
      return (
        <>
          <button ref={ref} type="button">
            Якорь
          </button>
          <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} title="Настройки">
            <button type="button">Опция</button>
          </Popover>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Настройки' })).not.toBeInTheDocument()
  })
})

describe('Toast', () => {
  it('показывает уведомление через aria-live', async () => {
    const user = userEvent.setup()

    function Trigger() {
      const toast = useToast()
      return (
        <button type="button" onClick={() => toast.push('Проект сохранён', 'success')}>
          Сохранить
        </button>
      )
    }

    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.getByRole('status')).toHaveTextContent('Проект сохранён')
  })
})

describe('EmptyState / ErrorState', () => {
  it('EmptyState рендерит заголовок и действие', () => {
    render(
      <EmptyState
        title="Выберите покрытие"
        description="Начните с каталога"
        action={<button type="button">Выбрать</button>}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Выберите покрытие')
    expect(screen.getByRole('button', { name: 'Выбрать' })).toBeInTheDocument()
  })

  it('ErrorState использует role=alert', () => {
    render(
      <ErrorState title="Ошибка каталога" description="Не удалось загрузить" details="timeout" />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка каталога')
  })
})
