from django.urls import path

from .fechas import FechasView
from .landing import LandingArchivoView, LandingView
from .limites import ExcepcionesEvaluadorView, ExcepcionesView, LimiteActividadView, LimiteCongresoView, LimitesView
from .constancias import AutorizacionConstanciasView, MisConstanciasView, RevocarAutorizacionView
from .pagos import ComprobanteAcademicoView, DictaminarPagoView, MiComprobanteView, MisPagosView, ValidacionPagosView
from .views import CatalogosCongresoView, CrearCongresoView

urlpatterns = [
    path("catalogos-congreso/", CatalogosCongresoView.as_view(), name="catalogos_congreso"),
    path("landing/", LandingView.as_view(), name="landing"),
    path("landing/archivos/", LandingArchivoView.as_view(), name="landing_archivos"),
    path("congresos/crear/", CrearCongresoView.as_view(), name="crear_congreso"),
    path("congreso/fechas/", FechasView.as_view(), name="fechas_importantes"),
    path("congreso/fechas/<int:pk>/", FechasView.as_view(), name="fechas_importantes_congreso"),
    path("congreso/limites/", LimitesView.as_view(), name="limites"),
    path("congreso/limites/actividades/<int:pk>/", LimiteActividadView.as_view(), name="limite_actividad"),
    path("congreso/limites/congresos/<int:pk>/", LimiteCongresoView.as_view(), name="limite_congreso"),
    path("congreso/limites/usuarios/", ExcepcionesView.as_view(), name="limite_excepciones"),
    path("congreso/limites/usuarios/<int:pk>/", ExcepcionesView.as_view(), name="limite_excepcion_detalle"),
    path("congreso/limites/evaluadores/", ExcepcionesEvaluadorView.as_view(), name="limite_evaluadores"),
    path("congreso/limites/evaluadores/<int:pk>/", ExcepcionesEvaluadorView.as_view(), name="limite_evaluador_detalle"),
    path("pagos/mis-pagos/", MisPagosView.as_view(), name="mis_pagos"),
    path("pagos/mis-pagos/<int:pk>/comprobante/", MiComprobanteView.as_view(), name="mi_comprobante"),
    path("pagos/validacion/", ValidacionPagosView.as_view(), name="validacion_pagos"),
    path("pagos/validacion/<int:pk>/", DictaminarPagoView.as_view(), name="dictaminar_pago"),
    path("pagos/validacion/<int:pk>/credencial/", ComprobanteAcademicoView.as_view(), name="pago_credencial"),
    path("constancias/autorizacion/", AutorizacionConstanciasView.as_view(), name="autorizacion_constancias"),
    path("constancias/autorizacion/<int:pk>/", RevocarAutorizacionView.as_view(), name="revocar_autorizacion_constancia"),
    path("constancias/mis-constancias/", MisConstanciasView.as_view(), name="mis_constancias"),
]
