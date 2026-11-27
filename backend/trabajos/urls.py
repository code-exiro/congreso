from django.urls import path

from .coordinador import AsignarEvaluadorView, ExtensoCoordinadorView, DictamenResumenView, EvaluadoresDisponiblesView, ListadoSolicitudesView
from .evaluaciones import ArchivoAsignadaView, AsignadaDetalleView, AsignadasView, EnviarEvaluacionView
from .extenso import ExtensoPonenteView
from .views import MisSolicitudesView, OpcionesSolicitudView, SolicitudDetalleView, VerificarCoautorView

urlpatterns = [
    path("trabajos/opciones/", OpcionesSolicitudView.as_view(), name="trabajos_opciones"),
    path("trabajos/coautores/verificar/", VerificarCoautorView.as_view(), name="trabajos_verificar_coautor"),
    path("trabajos/mis-solicitudes/", MisSolicitudesView.as_view(), name="trabajos_mis_solicitudes"),
    path("trabajos/mis-solicitudes/<int:pk>/", SolicitudDetalleView.as_view(), name="trabajos_solicitud_detalle"),
    path("trabajos/solicitudes/", ListadoSolicitudesView.as_view(), name="trabajos_solicitudes"),
    path("trabajos/solicitudes/<int:pk>/dictamen/", DictamenResumenView.as_view(), name="trabajos_dictamen"),
    path("trabajos/evaluadores/", EvaluadoresDisponiblesView.as_view(), name="trabajos_evaluadores"),
    path("trabajos/solicitudes/<int:pk>/evaluadores/", AsignarEvaluadorView.as_view(), name="trabajos_asignar_evaluador"),
    path("trabajos/mis-solicitudes/<int:pk>/extenso/", ExtensoPonenteView.as_view(), name="trabajos_extenso"),
    path("trabajos/solicitudes/<int:pk>/extenso/", ExtensoCoordinadorView.as_view(), name="trabajos_extenso_coord"),
    path("evaluaciones/asignadas/<int:pk>/archivo/", ArchivoAsignadaView.as_view(), name="evaluaciones_archivo"),
    path("evaluaciones/asignadas/", AsignadasView.as_view(), name="evaluaciones_asignadas"),
    path("evaluaciones/asignadas/<int:pk>/", AsignadaDetalleView.as_view(), name="evaluaciones_detalle"),
    path("evaluaciones/asignadas/<int:pk>/enviar/", EnviarEvaluacionView.as_view(), name="evaluaciones_enviar"),
]
