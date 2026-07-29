import { useEffect } from 'react'
import { Button } from '@/shared/ui/Button/Button'
import { useToast } from '@/shared/ui/Toast'
import { useProjectStorage } from '@/features/save-project/use-project-storage'
import { SaveIcon, LoadIcon } from '@/shared/ui/icons'
import styles from './ProjectHeaderActions.module.scss'

export function ProjectHeaderActions() {
  const { projectName, setProjectName, projects, message, clearMessage, handleSave, handleLoad } =
    useProjectStorage()
  const toast = useToast()

  useEffect(() => {
    if (!message) return
    if (message.includes('сохранён') || message.includes('загружен')) {
      toast.push(message, 'success')
    } else if (message.includes('не')) {
      toast.push(message, 'warning')
    } else {
      toast.push(message, 'info')
    }
    clearMessage()
  }, [message, toast, clearMessage])

  return (
    <div className={styles.bar}>
      <input
        className={styles.nameInput}
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Название проекта"
        aria-label="Название проекта"
      />
      <Button variant="secondary" onClick={handleSave} aria-label="Сохранить проект">
        <SaveIcon aria-hidden />
        Сохранить
      </Button>
      {projects.length > 0 ? (
        <label className={styles.loadWrap}>
          <LoadIcon aria-hidden />
          <select
            className={styles.loadSelect}
            value=""
            onChange={(e) => {
              const id = e.target.value
              if (id) handleLoad(id)
            }}
            aria-label="Загрузить проект"
          >
            <option value="">Загрузить…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({new Date(p.updatedAt).toLocaleDateString('ru-RU')})
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
