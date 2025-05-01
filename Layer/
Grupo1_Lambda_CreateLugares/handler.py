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
        # Obtener los datos del cuerpo de la solicitud
        body = json.loads(event.get('body', '{}'))
        nombre = body.get('nombre')
        descripcion = body.get('descripcion')
        imagen_url = body.get('imagen_url')
        video_url = body.get('video_url')
        url_info = body.get('url_info')
        url_mapa = body.get('url_mapa')

        # Conectar a la base de datos MySQL
        connection = pymysql.connect(host=endpoint, user=username, password=password, db=database_name)
        cursor = connection.cursor()

        # Ejecutar la consulta para insertar un nuevo lugar
        cursor.execute("""
            INSERT INTO lugares (nombre, descripcion, imagen_url, video_url, url_info, url_mapa)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (nombre, descripcion, imagen_url, video_url, url_info, url_mapa))

        # Confirmar la transacción
        connection.commit()

        # Obtener el id del nuevo lugar
        new_id = cursor.lastrowid

        # Cerrar conexión
        cursor.close()
        connection.close()

        return {
            'statusCode': 201,
            'body': json.dumps({"id": new_id, "message": "Lugar creado exitosamente"})
        }

    except Exception as e:
        print("Error al crear el lugar:", e)
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
