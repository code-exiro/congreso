"""Borra un congreso (p. ej. uno de prueba) junto con todo lo que depende de él.

Uso:
    python manage.py borrar_congreso            # lista los congresos existentes
    python manage.py borrar_congreso 99         # muestra qué se borraría (no borra)
    python manage.py borrar_congreso 99 --si    # borra de verdad (no se puede deshacer)

Si el congreso tiene trabajos, Django los protege: agrega --con-trabajos para borrarlos también (se muestra en la vista previa).
Los usuarios, roles y catálogos nunca se borran.

El número es la EDICIÓN del congreso. Al borrar el de edición más alta, el vigente pasa a ser el siguiente.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import ProtectedError
from django.db.models.deletion import Collector

from congreso.models import Congreso


class Command(BaseCommand):
    help = "Lista o borra un congreso por su edición (y todos sus datos asociados)."

    def add_arguments(self, parser):
        parser.add_argument("edicion", nargs="?", type=int)
        parser.add_argument("--si", "--confirmar", dest="si", action="store_true", help="confirma el borrado")
        parser.add_argument("--con-trabajos", action="store_true", help="borra también los trabajos del congreso")

    def handle(self, *args, **opts):
        if opts["edicion"] is None:
            for c in Congreso.objects.order_by("-edicion_congreso"):
                self.stdout.write(f"  edición {c.edicion_congreso}: {c.nombre_congreso} (id {c.pk})")
            return
        congresos = list(Congreso.objects.filter(edicion_congreso=opts["edicion"]))
        if not congresos:
            raise CommandError(f"No existe un congreso con edición {opts['edicion']}.")
        if Congreso.objects.exclude(pk__in=[c.pk for c in congresos]).count() == 0:
            raise CommandError("Ese es el único congreso que existe: no se borra para no dejar el sistema sin congreso.")
        from trabajos.models import Evaluador, Trabajo, TrabajoPregunta

        class _Vista(Exception):
            pass

        try:
            with transaction.atomic():
                for c in congresos:
                    if opts["con_trabajos"]:
                        n = Trabajo.objects.filter(congreso=c).count()
                        self.stdout.write(f"{c} — trabajos a borrar (con sus archivos y evaluaciones): {n}")
                        # Las respuestas protegen a los evaluadores: se borran primero, luego evaluadores y trabajos.
                        TrabajoPregunta.objects.filter(trabajo__congreso=c).delete()
                        Evaluador.objects.filter(trabajo__congreso=c).delete()
                        Trabajo.objects.filter(congreso=c).delete()
                    collector = Collector(using="default")
                    try:
                        collector.collect([c])
                    except ProtectedError:
                        raise CommandError(
                            f"{c} tiene trabajos u otros datos protegidos. Revisa y, si son de prueba, agrega --con-trabajos."
                        )
                    self.stdout.write(f"{c} — se borrarían:")
                    for modelo, objs in sorted(collector.data.items(), key=lambda x: x[0]._meta.label):
                        self.stdout.write(f"  {modelo._meta.label}: {len(objs)}")
                    c.delete()
                if not opts["si"]:
                    raise _Vista()
        except _Vista:
            self.stdout.write(self.style.WARNING("\nVista previa: no se borró nada. Repite con --si para confirmar."))
            return
        self.stdout.write(self.style.SUCCESS("Borrado."))
