import json
import pymysql
import traceback

# Configuración de conexión
endpoint = 'grupo1-turisardb-mysql.c4r4c6im0sz5.us-east-1.rds.amazonaws.com'
username = 'admin'
password = 'turisARG1'
database_name = 'TurisAR_G1'

def lambda_handler(event, context):
    try:
        # Conectar a la base de datos MySQL
        connection = pymysql.connect(host=endpoint, user=username, password=password, db=database_name)
        cursor = connection.cursor()

        # Ejecutar la consulta para obtener los lugares
        cursor.execute('SELECT id, nombre, descripcion, imagen_url, video_url, url_info, url_mapa FROM lugares')
        rows = cursor.fetchall()

        # Cerrar conexión
        cursor.close()
        connection.close()

        # Formatear los resultados como JSON
        items = []
        for row in rows:
            items.append({
                "id": row[0],
                "nombre": row[1],
                "descripcion": row[2],
                "imagen_url": row[3],
                "video_url": row[4],
                "url_info": row[5],
                "url_mapa": row[6]
            })

        return {
            'statusCode': 200,
            'body': json.dumps(items)
        }

    except Exception as e:
        print("Error al obtener los lugares:", e)
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
