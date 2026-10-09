# Seguimiento Gráfico Catenaria – Tramo 3 y 4 | L2 Metro Lima
## Guía de despliegue: GitHub Pages + Google Apps Script

---

## ARQUITECTURA (GRATIS)

```
[Equipo actualiza] --> [GitHub Pages: index.html] <--> [Google Apps Script API]
                                                              |
                                                    [Google Sheets: base de datos]
```

- GitHub Pages: el sitio web (GRATIS, siempre activo)
- Google Apps Script: tu API/backend (GRATIS, 20.000 req/dia)
- Google Sheets: base de datos (GRATIS, 1869 filas = nada)

---

## PASO 1: Crear el Google Sheet y cargar los datos

1. Ve a https://sheets.google.com y crea una hoja nueva
   Nombre sugerido: "Catenaria T3T4 - Seguimiento"

2. En la hoja "Hoja 1", renombrala a "Soportes":
   - Clic derecho en la pestaña > Cambiar nombre > "Soportes"

3. Importa el CSV:
   - Menu: Archivo > Importar
   - Selecciona el archivo: soportes_init.csv (esta en esta carpeta)
   - Separador: Coma
   - Convierte numeros: Si
   - Reemplaza los datos de la hoja actual
   - Clic en Importar

4. Copia el ID del Sheet de la URL:
   URL ejemplo: https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit
   El ID es: 1ABC...XYZ (entre /d/ y /edit)
   Guardalo, lo necesitaras en el paso 2.

---

## PASO 2: Configurar Google Apps Script

1. Con el Sheet abierto, ve a:
   Extensiones > Apps Script

2. Borra todo el contenido del editor y pega el contenido de Code.gs
   (archivo en esta carpeta)

3. Busca esta linea al inicio y reemplaza el ID:
   const SHEET_ID = 'TU_SHEET_ID_AQUI';
   Pon el ID del paso anterior.

4. Guarda: Ctrl+S
   Nombre del proyecto: "Catenaria-API"

5. Publicar como Web App:
   - Clic en "Implementar" > "Nueva implementacion"
   - Tipo: Aplicacion web
   - Descripcion: v1
   - Ejecutar como: Yo (tu cuenta)
   - Quienes tienen acceso: Cualquier usuario
   - Clic "Implementar"
   - Autoriza los permisos cuando te pida (es tu cuenta, es seguro)

6. Copia la URL que aparece. Se ve asi:
   https://script.google.com/macros/s/AKfyc.../exec
   Guardala para el paso 3.

---

## PASO 3: Configurar GitHub Pages

1. Crea una cuenta en https://github.com (si no tienes)

2. Crea un repositorio nuevo:
   - Clic en "+" > "New repository"
   - Nombre: catenaria-t3t4 (o el que quieras)
   - Visibilidad: Public (para GitHub Pages gratis)
   - Clic "Create repository"

3. Sube los archivos:
   Opcion A (interface web, mas facil):
   - En el repo, clic "uploading an existing file"
   - Arrastra index.html y soportes.json desde esta carpeta
   - Escribe un mensaje: "Primera version"
   - Clic "Commit changes"

   Opcion B (git, si sabes usarlo):
   cd "D:/2026/00_inbox/07. SISTEMAS, IA Y AUTOMATIZACIÓN/Seguimiento_Grafico_Catenaria/web_catenaria"
   git init
   git add index.html soportes.json
   git commit -m "Primera version"
   git remote add origin https://github.com/TU_USUARIO/catenaria-t3t4.git
   git push -u origin main

4. Activa GitHub Pages:
   - En el repo, ve a Settings (Configuracion)
   - Baja hasta "Pages"
   - Source: "Deploy from a branch"
   - Branch: main / (root)
   - Save

5. En 1-2 minutos tu sitio estara en:
   https://TU_USUARIO.github.io/catenaria-t3t4/

---

## PASO 4: Conectar el frontend con Apps Script

1. Abre index.html en un editor de texto (Notepad, VSCode)

2. Busca estas dos lineas al inicio del script:
   const APPS_SCRIPT_URL = 'TU_APPS_SCRIPT_URL_AQUI';
   const USE_LOCAL_DATA = true;

3. Reemplaza:
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc.../exec';
   const USE_LOCAL_DATA = false;

4. Guarda el archivo y vuelve a subirlo a GitHub (sobreescribe el anterior)

5. En 1-2 minutos el sitio usara Google Sheets como base de datos en tiempo real.

---

## MODO LOCAL (sin internet, para pruebas)

Con USE_LOCAL_DATA = true el sitio:
- Lee los datos del archivo soportes.json local
- Guarda cambios en el localStorage del navegador (persiste en tu PC)
- NO sincroniza con el equipo

Util para: revisar el tablero sin conexion o hacer demos.

---

## COMO ACTUALIZAR DATOS DESDE EXCEL (sincronizacion periodica)

Cuando actualices el Excel original, corre:
  python sync_from_excel.py

Esto regenera soportes.json con el avance del Excel sin pisar
los comentarios y cambios que ya hayas hecho en la web.
Luego sube el nuevo soportes.json a GitHub.

---

## COMPARTIR CON EL EQUIPO

Una vez en GitHub Pages, el link es publico:
  https://TU_USUARIO.github.io/catenaria-t3t4/

- Cualquiera con el link puede VER el tablero
- Cualquiera puede EDITAR (marcar actividades, comentar)
- Todos los cambios se guardan en Google Sheets en tiempo real
- La ultima actualizacion se muestra en el header

Para restringir acceso: cambia el repo a Private y usa GitHub Pro
(no necesario por ahora).

---

## ARCHIVOS EN ESTA CARPETA

- index.html        -> El sitio web completo
- soportes.json     -> Datos iniciales (1869 soportes con avance migrado)
- soportes_init.csv -> Para importar a Google Sheets
- Code.gs           -> Backend (pegar en Apps Script)
- README.md         -> Esta guia

---

## PREGUNTAS FRECUENTES

P: Alguien actualizo algo y no me aparece
R: El sitio carga datos cada vez que abres la pagina. Presiona F5.

P: Quiero agregar un soporte nuevo
R: Agrega una fila en Google Sheets con el mismo formato. Automaticamente aparece en la web.

P: Se perdio un cambio
R: Los cambios se guardan en Google Sheets. Revisa la hoja "Log" para ver el historial.

P: Quiero exportar el avance actual
R: En la pestaña "Tabla Soportes" hay un boton "Exportar CSV".
