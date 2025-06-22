from fastapi import FastAPI, UploadFile, File, Response, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import io
import time
import os
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for lazy loading
models_loaded = {
    'bria': False,
    'inspyrenet': False,
    'rembg': False,
    'ormbg': False,
    'carvekit': False
}

bria_model = None
inspyrenet_model = None
rembg_models = {}
ormbg_processor = None
carvekit_models = {}

def load_bria_model():
    global bria_model
    if not models_loaded['bria']:
        try:
            from transformers import pipeline
            bria_model = pipeline("image-segmentation", model="briaai/RMBG-1.4", trust_remote_code=True, device="cpu")
            models_loaded['bria'] = True
            logger.info("Bria model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Bria model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load Bria model: {e}")

def load_inspyrenet_model():
    global inspyrenet_model
    if not models_loaded['inspyrenet']:
        try:
            from transparent_background import Remover
            inspyrenet_model = Remover()
            inspyrenet_model.model.cpu()
            models_loaded['inspyrenet'] = True
            logger.info("InSPyReNet model loaded successfully")
        except ImportError as e:
            error_msg = f"InSPyReNet requires transparent-background package. Try: pip install transparent-background"
            logger.error(f"InSPyReNet Import Error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"InSPyReNet unavailable: {error_msg}")
        except RuntimeError as e:
            if "CUDA" in str(e) or "GPU" in str(e):
                error_msg = f"InSPyReNet CUDA/GPU error: {str(e)}. Try restarting or use CPU-only models."
                logger.error(f"InSPyReNet GPU Error: {error_msg}")
                raise HTTPException(status_code=500, detail=f"InSPyReNet GPU issue: {error_msg}")
            else:
                logger.error(f"InSPyReNet Runtime Error: {e}")
                raise HTTPException(status_code=500, detail=f"InSPyReNet error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to load InSPyReNet model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load InSPyReNet model: {str(e)}")

def load_rembg_models():
    global rembg_models
    if not models_loaded['rembg']:
        try:
            from rembg import remove as rembg_remove, new_session
            rembg_models = {
                'u2net': new_session('u2net'),
                'u2net_human_seg': new_session('u2net_human_seg'),
                'isnet-general-use': new_session('isnet-general-use'),
                'isnet-anime': new_session('isnet-anime')
            }
            models_loaded['rembg'] = True
            logger.info("REMBG models loaded successfully")
        except ImportError as e:
            if "onnxruntime_pybind11_state" in str(e) or "DLL load failed" in str(e):
                error_msg = "REMBG models require onnxruntime with proper Windows DLLs. Try: pip uninstall onnxruntime -y && pip install onnxruntime==1.15.1"
                logger.error(f"REMBG DLL Error: {error_msg}")
                raise HTTPException(status_code=500, detail=f"REMBG models unavailable: {error_msg}")
            else:
                logger.error(f"Failed to load REMBG models: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to load REMBG models: {e}")
        except Exception as e:
            logger.error(f"Failed to load REMBG models: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load REMBG models: {e}")

def load_ormbg_model():
    global ormbg_processor
    if not models_loaded['ormbg']:
        try:
            import torch
            from ormbg import ORMBGProcessor
            ormbg_model_path = os.path.expanduser("~/.ormbg/ormbg.pth")
            if not os.path.exists(ormbg_model_path):
                raise FileNotFoundError(f"ORMBG model file not found: {ormbg_model_path}")
            ormbg_processor = ORMBGProcessor(ormbg_model_path)
            if torch.cuda.is_available():
                ormbg_processor.to("cuda")
            else:
                ormbg_processor.to("cpu")
            models_loaded['ormbg'] = True
            logger.info("ORMBG model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load ORMBG model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load ORMBG model: {e}")

def load_carvekit_models():
    global carvekit_models
    if not models_loaded['carvekit']:
        try:
            from carvekit.ml.files.models_loc import download_all
            download_all()
            
            from carvekit.ml.wrap.u2net import U2NET
            from carvekit.ml.wrap.basnet import BASNET
            from carvekit.ml.wrap.fba_matting import FBAMatting
            from carvekit.ml.wrap.deeplab_v3 import DeepLabV3
            from carvekit.ml.wrap.tracer_b7 import TracerUniversalB7
            from carvekit.api.interface import Interface
            from carvekit.pipelines.postprocessing import MattingMethod
            from carvekit.pipelines.preprocessing import PreprocessingStub
            from carvekit.trimap.generator import TrimapGenerator
            
            def initialize_carvekit_model(seg_pipe_class, device='cpu'):
                model = Interface(
                    pre_pipe=PreprocessingStub(),
                    post_pipe=MattingMethod(
                        matting_module=FBAMatting(device=device, input_tensor_size=2048, batch_size=1),
                        trimap_generator=TrimapGenerator(),
                        device=device
                    ),
                    seg_pipe=seg_pipe_class(device=device, batch_size=1)
                )
                model.segmentation_pipeline.to('cpu')
                return model

            carvekit_models = {
                'u2net': initialize_carvekit_model(U2NET),
                'tracer': initialize_carvekit_model(TracerUniversalB7),
                'basnet': initialize_carvekit_model(BASNET),
                'deeplab': initialize_carvekit_model(DeepLabV3)
            }
            models_loaded['carvekit'] = True
            logger.info("Carvekit models loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Carvekit models: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load Carvekit models: {e}")

def process_with_bria(image):
    load_bria_model()
    result = bria_model(image, return_mask=True)
    mask = result
    if not isinstance(mask, Image.Image):
        import numpy as np
        mask = Image.fromarray((mask * 255).astype('uint8'))
    no_bg_image = Image.new("RGBA", image.size, (0, 0, 0, 0))
    no_bg_image.paste(image, mask=mask)
    return no_bg_image

def process_with_inspyrenet(image):
    load_inspyrenet_model()
    return inspyrenet_model.process(image, type='rgba')

def process_with_rembg(image, model='u2net'):
    load_rembg_models()
    from rembg import remove as rembg_remove
    return rembg_remove(image, session=rembg_models[model])

def process_with_ormbg(image):
    load_ormbg_model()
    return ormbg_processor.process_image(image)

def process_with_carvekit(image, model='u2net'):
    load_carvekit_models()
    return carvekit_models[model]([image])[0]

@app.post("/remove_background/")
async def remove_background(file: UploadFile = File(...), method: str = Form(...)):
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        start_time = time.time()
        
        if method == 'bria':
            no_bg_image = process_with_bria(image)
        elif method == 'inspyrenet':
            no_bg_image = process_with_inspyrenet(image)
        elif method in ['u2net_human_seg', 'isnet-general-use', 'isnet-anime']:
            no_bg_image = process_with_rembg(image, model=method)
        elif method == 'ormbg':
            no_bg_image = process_with_ormbg(image)
        elif method in ['u2net', 'tracer', 'basnet', 'deeplab']:
            no_bg_image = process_with_carvekit(image, model=method)
        else:
            raise HTTPException(status_code=400, detail="Invalid method")
        
        process_time = time.time() - start_time
        logger.info(f"Background removal time ({method}): {process_time:.2f} seconds")
        
        with io.BytesIO() as output:
            no_bg_image.save(output, format="PNG")
            content = output.getvalue()

        return Response(content=content, media_type="image/png")

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Background removal API is running", "available_methods": ["bria", "inspyrenet", "u2net_human_seg", "isnet-general-use", "isnet-anime", "ormbg", "u2net", "tracer", "basnet", "deeplab"]}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": models_loaded}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9876) 