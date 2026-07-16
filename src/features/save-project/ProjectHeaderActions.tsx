import { Button } from '@/shared/ui/Button/Button'
import { useProjectStorage } from '@/features/save-project/use-project-storage'
import styles from './ProjectHeaderActions.module.scss'

export function ProjectHeaderActions() {
  const {
    projectName,
    setProjectName,
    projects,
    message,
    handleSave,
    handleLoad,
  } = useProjectStorage()

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
      <Button variant="primary" onClick={handleSave}>
        Сохранить
      </Button>
      {projects.length > 0 ? (
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
      ) : null}
      {message ? (
        <span className={styles.message} aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  )
}
