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

        # Ejecutar la consulta para obtener los filtros
        cursor.execute('SELECT * FROM filtros')
        rows = cursor.fetchall()

        # Cerrar conexión
        cursor.close()
        connection.close()

        # Formatear los resultados como JSON
        items = []
        for row in rows:
            items.append({
                "key": row[0],
                "lugar_id": row[1],
                "path": row[2],
                "size_x": row[3],
                "size_y": row[4],
                "pos_x": row[5],
                "pos_y": row[6],
                "pos_z": row[7],
                "display_name": row[8]
            })

        return {
            'statusCode': 200,
            'body': json.dumps(items)
        }

    except Exception as e:
        print("Error al obtener los filtros:", e)
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
