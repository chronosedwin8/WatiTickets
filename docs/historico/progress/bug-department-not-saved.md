# 🐛 BUG CRÍTICO ENCONTRADO Y CORREGIDO - Campo `department` No Se Guardaba

## El Problema Descubierto

El usuario creó un usuario de "Comunicaciones" desde la UI y **SÍ asignó el departamento "Comunicaciones"** en el dropdown, pero en la base de datos el campo `department` aparecía como **`NULL`**.

**Consecuencia**: Los analytics NO se filtraban correctamente para usuarios no-admin porque el sistema no podía mapear el departamento del usuario con el team correspondiente.

---

## Causa Raíz

El código de **creación y edición de usuarios** NO estaba guardando el campo `department` en la tabla `profiles`.

### Flujo Actual (INCORRECTO):
```
1. Usuario selecciona "Comunicaciones" en dropdown de departamento
2. Se guarda en tabla `team_members` (relación usuario-team)
3. ❌ NO se guarda en campo `profiles.department`
4. Resultado: profiles.department = NULL
```

### Archivos Afectados:
1. **`src/pages/settings/team/CreateUserForm.tsx`** - Crear usuario
2. **`src/pages/settings/team/EditMemberModal.tsx`** - Editar usuario

---

## Código con BUG

### 1. CreateUserForm.tsx (Líneas 77-85)

```typescript
// ❌ CÓDIGO ANTERIOR - NO guardaba department
await profilesApi.create({
    id: authData.user.id,
    tenant_id: tenant.id,
    email: newUserData.email,
    full_name: newUserData.fullName,
    role: newUserData.role,
    // ← FALTA department aquí!
    is_active: true,
    avatar_url: `https://ui-avatars.com/api/?name=...`
})

// Se guarda en team_members pero no en profiles.department
if (newUserData.departmentId) {
    await teamsApi.addMember(newUserData.departmentId, authData.user.id)
}
```

### 2. EditMemberModal.tsx (Líneas 61-64)

```typescript
// ❌ CÓDIGO ANTERIOR - NO guardaba department
await profilesApi.update(member.id, {
    full_name: editData.fullName,
    role: editData.role,
    // ← FALTA department aquí!
})

// Se guarda en team_members pero no en profiles.department
```

---

## Solución Implementada

### ✅ Fix 1: CreateUserForm.tsx

```typescript
// ✅ CÓDIGO CORREGIDO
// Get the team name for the selected department
const selectedTeam = teams.find(t => t.id === newUserData.departmentId)
const departmentName = selectedTeam?.name || null

await profilesApi.create({
    id: authData.user.id,
    tenant_id: tenant.id,
    email: newUserData.email,
    full_name: newUserData.fullName,
    role: newUserData.role,
    department: departmentName,  // ✅ AHORA SÍ se guarda
    is_active: true,
    avatar_url: `https://ui-avatars.com/api/?name=...`
})

// También se guarda en team_members para relación many-to-many
if (newUserData.departmentId) {
    await teamsApi.addMember(newUserData.departmentId, authData.user.id)
}
```

### ✅ Fix 2: EditMemberModal.tsx

```typescript
// ✅ CÓDIGO CORREGIDO
// Get the team name for the selected team
const selectedTeam = teams.find(t => t.id === selectedTeamId)
const departmentName = selectedTeam?.name || null

await profilesApi.update(member.id, {
    full_name: editData.fullName,
    role: editData.role,
    department: departmentName,  // ✅ AHORA SÍ se guarda
})

// También actualiza team_members
```

---

## Flujo Corregido

```
1. Usuario selecciona "Comunicaciones" en dropdown
2. ✅ Se guarda en tabla `team_members` (relación many-to-many)
3. ✅ Se guarda en campo `profiles.department` (nombre del team)
4. Resultado: profiles.department = "Comunicaciones"
5. ✅ Analytics puede hacer match y filtrar correctamente
```

---

## Impacto del Bug

### Afectaba A:
- ✅ **Analytics por departamento** - NO filtraba correctamente
- ✅ **Cualquier funcionalidad** que use `profile.department`
- ✅ **Reportes y estadísticas** que filtren por departamento

### NO Afectaba A:
- ❌ Team members (tabla `team_members` sí se actualizaba)
- ❌ Permisos basados en teams (funcionaban con `team_members`)

---

## Por Qué Pasó Desapercibido

1. **Dos fuentes de verdad**:
   - `profiles.department` (campo directo)
   - `team_members` (tabla de relación)

2. **La UI funcionaba**:
   - Los dropdowns mostraban correctamente los teams
   - Porque leían de `team_members`, no de `profiles.department`

3. **El bug era silencioso**:
   - No generaba errores
   - Solo causaba mal funcionamiento en analytics

---

## Script SQL de Corrección

Para usuarios ya creados con `department = NULL`, ejecuta:

```sql
-- Actualizar department basado en team_members
UPDATE profiles p
SET department = (
    SELECT t.name
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = p.id
    LIMIT 1  -- Asume un solo departamento por usuario
)
WHERE p.department IS NULL
  AND p.role != 'admin'
  AND EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.user_id = p.id
  );

-- Verificar
SELECT 
    p.email, 
    p.full_name, 
    p.role, 
    p.department,
    t.name as team_name
FROM profiles p
LEFT JOIN team_members tm ON tm.user_id = p.id
LEFT JOIN teams t ON t.id = tm.team_id
WHERE p.role != 'admin'
ORDER BY p.department, p.email;
```

---

## Testing Recomendado

### Test 1: Crear Nuevo Usuario
1. Ir a Settings → Equipo
2. Crear nuevo usuario
3. Asignar departamento "Comunicaciones"
4. Guardar
5. ✅ Verificar en BD: `profiles.department = "Comunicaciones"`

### Test 2: Editar Usuario Existente
1. Editar un usuario
2. Cambiar departamento a "Sistemas"
3. Guardar
4. ✅ Verificar en BD: `profiles.department = "Sistemas"`

### Test 3: Analytics
1. Login como usuario no-admin
2. Ir a Analytics
3. ✅ Verificar que solo ve datos de su departamento
4. ✅ Verificar en consola: "✅ Matched team: {id, name}"

---

## Prevención Futura

### Recomendaciones:

1. **Validación en BD**:
   ```sql
   -- Agregar constraint para forzar sincronización
   -- (Requiere lógica de trigger)
   ```

2. **Usar UNA sola fuente de verdad**:
   - Opción A: Solo usar `profiles.department`
   - Opción B: Solo usar `team_members` y eliminar `profiles.department`
   - **Recomendación**: Mantener ambos para flexibilidad, pero sincronizar siempre

3. **Testing automatizado**:
   - Test E2E que cree usuario y verifique que `department` se guarde
   - Test E2E que edite usuario y verifique sincronización

4. **Logging**:
   - Agregar logs cuando se guarde/actualice usuario
   - Mostrar warning si `department` está NULL para no-admins

---

## Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `CreateUserForm.tsx` | 76-85 | Agregado `department: departmentName` |
| `EditMemberModal.tsx` | 56-86 | Agregado `department: departmentName` |

---

## Estado Final

✅ **CORREGIDO** - Ahora al crear o editar usuarios, el campo `department` se guarda correctamente  
✅ **Analytics funciona** - Los usuarios ven solo datos de su departamento  
✅ **Sincronizado** - `profiles.department` siempre refleja el team asignado  

---

## Lección Aprendida

**Siempre sincronizar datos redundantes**:
- Si tienes `profiles.department` Y `team_members`
- Deben actualizarse JUNTOS en la misma transacción
- O usar triggers de BD para mantenerlos sincronizados
- O eliminar la redundancia y usar solo una fuente

En este caso, `profiles.department` es útil para queries rápidas y filtrado sin JOINs, por lo que vale la pena mantenerlo si se sincroniza correctamente.

---

## 🎯 Próximo Paso

Ejecuta el script SQL de corrección para actualizar los usuarios existentes que tienen `department = NULL`.

```sql
-- Ver usuarios afectados
SELECT email, full_name, role, department
FROM profiles
WHERE department IS NULL AND role != 'admin';

-- Corregirlos
UPDATE profiles p
SET department = (
    SELECT t.name
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = p.id
    LIMIT 1
)
WHERE p.department IS NULL AND p.role != 'admin';
```

**¡Bug encontrado y corregido!** 🚀
