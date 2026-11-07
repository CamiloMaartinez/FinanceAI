# Diagramas UML – Smart Finance (Grupo 6)

Cada diagrama está en tres formatos: `.puml` (fuente editable), `.png` (para el informe) y `.svg` (vectorial, sin pérdida al ampliar).
`_estilo.iuml` define los colores y la fuente comunes; todos los diagramas lo incluyen.

| Archivo | Diagrama |
|---|---|
| 01_casos_de_uso_completo / 01a / 01b | Casos de uso (completo y en dos partes) |
| 02a_clases_propuesta1_dominio_rico | Clases – Propuesta 1 |
| 02b_clases_propuesta2_modelo, 02c_clases_propuesta2_capas | Clases – Propuesta 2 (seleccionada) |
| 03a, 03b | Actividades |
| 04a – 04d | Secuencia |
| 05a – 05d | Estados |
| 06_componentes | Componentes |

## Cómo editar y regenerar
1. Abrir el `.puml` en https://www.plantuml.com/plantuml (pegando también el contenido de `_estilo.iuml`) o en VS Code con la extensión *PlantUML*.
2. Para regenerar todo en la terminal (requiere Java y Graphviz):
   `java -DPLANTUML_LIMIT_SIZE=12000 -jar plantuml.jar -tpng *.puml && java -jar plantuml.jar -tsvg *.puml`
3. El nombre del archivo de salida sale de la línea `@startuml <nombre>`; si se renombra un archivo, cambie también ese nombre.
